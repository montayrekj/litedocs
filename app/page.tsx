import Link from "next/link";
import { FileText, Users, Upload, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-semibold text-gray-900">Ajaia Docs</span>
        </div>
        <Link
          href="/login"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Collaborative documents,{" "}
          <span className="text-blue-600">without the complexity</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Create, edit, and share rich-text documents. Import from files.
          Everything persists, everything syncs.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-blue-700 transition-colors"
        >
          Get started — it&apos;s free
        </Link>
      </section>

      {/* Demo credentials callout */}
      <section className="max-w-2xl mx-auto px-6 mb-16">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="font-semibold text-blue-900 mb-3 text-sm uppercase tracking-wide">
            Demo Accounts
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="font-medium text-gray-900 mb-1">Alice (Owner)</p>
              <p className="text-gray-600 font-mono">alice@demo.local</p>
              <p className="text-gray-600 font-mono">Demo1234!</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="font-medium text-gray-900 mb-1">Bob (Collaborator)</p>
              <p className="text-gray-600 font-mono">bob@demo.local</p>
              <p className="text-gray-600 font-mono">Demo1234!</p>
            </div>
          </div>
          <p className="text-blue-700 text-xs mt-3">
            Sign in as Alice, create a document, share it with bob@demo.local, then sign in as Bob to see it under &quot;Shared with me&quot;.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: FileText,
              title: "Rich-text editing",
              desc: "Bold, italic, underline, headings, bullet and numbered lists.",
            },
            {
              icon: Upload,
              title: "File import",
              desc: "Import .txt and .md files directly into new editable documents.",
            },
            {
              icon: Users,
              title: "Easy sharing",
              desc: "Share any document with another user by email. They can edit instantly.",
            },
            {
              icon: Shield,
              title: "Access control",
              desc: "Row-level security enforced in the database. Owners control access.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <Icon className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
