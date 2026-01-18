export default function Home() {
  return (
    <div className="relative overflow-hidden rounded-2xl p-10 sm:p-16 bg-gradient-to-br from-brand-50 via-white to-brand-100 border">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-200/40 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-brand-300/30 rounded-full blur-3xl" />
      <div className="relative max-w-3xl">
        <h1 className="text-3xl sm:text-5xl font-semibold text-brand-800 leading-tight">MaktabTest</h1>
        <p className="mt-4 text-base sm:text-lg text-gray-700">
          O‘qituvchi test yaratadi, o‘quvchi sinf va fan bo‘yicha topadi va topshiradi. Tez, qulay va chiroyli.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Yuqoridagi navigatsiya tugmalari orqali o‘quvchi yoki o‘qituvchi sahifasiga o‘ting.
        </p>
      </div>
    </div>
  )
}
