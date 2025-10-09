"use client"
import Image from "next/image";

const FinanceChart = () => {
    return (
        <div className="bg-white rounded-xl w-full h-full p-4">

            {/* TITLE */}
            <div className='flex justify-between items-center'>
                <h1 className='text-lg font-semibold'>Finance</h1>
                <Image src="/moreDark.png" alt='' width={20} height={20} />
            </div>
        </div>

    )
}

export default FinanceChart;