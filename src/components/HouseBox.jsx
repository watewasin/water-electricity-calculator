export default function HouseBox({ house, onClick, isHighlighted = false }) {
    const isPending = house.status === 'pending';

    return (
        <div
            onClick={() => onClick(house)}
            className={`
        w-12 h-7 flex items-center justify-center
        text-[10px] font-bold cursor-pointer
        rounded shadow-lg transition-all duration-200
        hover:scale-110 hover:z-10 hover:shadow-xl
        ${isHighlighted
                    ? 'ring-2 ring-yellow-400 scale-110'
                    : ''
                }
        ${isPending
                    ? 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-800 hover:from-slate-100 hover:to-slate-200'
                    : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white hover:from-emerald-400 hover:to-emerald-600'
                }
      `}
            title={`House ${house.label} - ${isPending ? 'Pending' : 'Billed'}`}
        >
            {house.label}
        </div>
    );
}
