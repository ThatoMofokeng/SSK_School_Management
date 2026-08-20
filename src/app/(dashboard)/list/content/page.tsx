import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import ContentUploadButton from "@/components/ContentUploadButton";
import DeleteContentFileButton from "@/components/DeleteContentFileButton";

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-700",
  doc: "bg-blue-100 text-blue-700",
  docx: "bg-blue-100 text-blue-700",
  xls: "bg-green-100 text-green-700",
  xlsx: "bg-green-100 text-green-700",
  ppt: "bg-orange-100 text-orange-700",
  pptx: "bg-orange-100 text-orange-700",
  zip: "bg-gray-200 text-gray-700",
};

const FileTypeBadge = ({ fileType }: { fileType: string }) => (
  <span
    className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${
      TYPE_COLORS[fileType.toLowerCase()] || "bg-gray-100 text-gray-600"
    }`}
  >
    {fileType}
  </span>
);

const ContentCollectionPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  // Admins see the whole school's library; teachers see only their own
  // uploads - same personal-scope model as Blackboard's default Content
  // Collection view.
  const files = await prisma.contentFile.findMany({
    where: role === "admin" ? {} : { uploadedBy: currentUserId! },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">Content Collection</h1>
          <p className="text-xs text-gray-400">
            {role === "admin"
              ? "All files uploaded across the school."
              : "Files you've uploaded. Attach them to assignments without re-uploading."}
          </p>
        </div>
        <ContentUploadButton />
      </div>

      {files.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-16">
          No files yet. Click Upload to add your first one.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs border-b border-gray-200">
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium hidden md:table-cell">Size</th>
              <th className="p-3 font-medium hidden md:table-cell">
                Uploaded
              </th>
              {role === "admin" && (
                <th className="p-3 font-medium hidden md:table-cell">By</th>
              )}
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file: {
              id: number;
              fileName: string;
              fileUrl: string;
              fileType: string;
              fileSize: number | null;
              uploadedBy: string;
              uploaderRole: string;
              createdAt: Date;
            }) => (
              <tr
                key={file.id}
                className="border-b border-gray-100 even:bg-slate-50 hover:bg-lamaPurpleLight"
              >
                <td className="p-3">
                  <FileTypeBadge fileType={file.fileType} />
                </td>
                <td className="p-3">
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lamaSky hover:underline"
                  >
                    {file.fileName}
                  </a>
                </td>
                <td className="p-3 hidden md:table-cell text-gray-500">
                  {formatBytes(file.fileSize)}
                </td>
                <td className="p-3 hidden md:table-cell text-gray-500">
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                  }).format(file.createdAt)}
                </td>
                {role === "admin" && (
                  <td className="p-3 hidden md:table-cell text-gray-500">
                    {file.uploadedBy === currentUserId
                      ? "You"
                      : file.uploaderRole.charAt(0).toUpperCase() +
                        file.uploaderRole.slice(1)}
                  </td>
                )}
                <td className="p-3">
                  {(role === "admin" || file.uploadedBy === currentUserId) && (
                    <DeleteContentFileButton id={file.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ContentCollectionPage;