"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex-1 p-6">
      <div className="bg-white rounded-md p-6 border border-red-100">
        <h2 className="text-lg font-semibold text-red-600">Unable to load student</h2>
        <p className="mt-2 text-sm text-gray-600">Please try again. If the problem continues, check the server terminal for the database error.</p>
        <button onClick={() => reset()} className="mt-4 px-4 py-2 rounded-md bg-lamaSky text-sm font-medium">Try again</button>
      </div>
    </div>
  );
}
