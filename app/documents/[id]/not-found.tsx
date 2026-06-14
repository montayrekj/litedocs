import Link from "next/link";
import { FileText } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <FileText className="h-12 w-12 text-gray-300 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Document not found</h1>
      <p className="text-gray-500 text-sm mb-6">
        This document doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
