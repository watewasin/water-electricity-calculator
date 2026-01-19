export default function HouseBox({ house, onClick }) {
    const isPending = house.status === 'pending';

    return (
        <div
            onClick={() => onClick(house)}
            className={`
        w-12 h-7 flex items-center justify-center
        text-[11px] font-bold text-white cursor-pointer
        rounded shadow-lg transition-all duration-200
        hover:scale-110 hover:z-10 hover:shadow-xl
        ${isPending
                    ? 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600'
                    : 'bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600'
                }
      `}
            title={`House ${house.label} - ${isPending ? 'Pending' : 'Billed'}`}
        >
            {house.label}
        </div>
    );
}
