const Table = ({
    columns,
    renderRow,
    data
}: {
    columns: { header: string; accessor: string; className?: string }[];
    renderRow: (item: any) => React.ReactNode;
    data: any[];
}) => {
    return (
        <table className="w-full mt-4 table-auto">
            <thead>
                <tr>
                    {columns.map((col) => (
                        <th key={col.accessor} className={`p-4 text-left font-medium text-gray-600 ${col.className || ""}`}>
                            {col.header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>{data.map((item) => renderRow(item))}</tbody>
        </table>
    )
}

export default Table;