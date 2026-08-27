export default function Loading() {
  return (
    <div className="flex-1 p-4">
      <div className="bg-white rounded-md p-6 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
        <div className="h-32 w-full bg-gray-100 rounded" />
      </div>
    </div>
  );
}
