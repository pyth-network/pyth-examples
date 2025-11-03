import React from 'react'
import { Minus, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

const NumberInput = ({
                         value,
                         onChange,
                         min = 1,
                         max = 100,
                         label,
                         description,
                         compact = false
                     }) => {
    const handleIncrement = () => {
        if (value < max) onChange(value + 1)
    }

    const handleDecrement = () => {
        if (value > min) onChange(value - 1)
    }

    const handleSliderChange = (e) => {
        onChange(Number(e.target.value))
    }

    const percentage = ((value - min) / (max - min)) * 100

    return (
        <div className={compact ? 'space-y-2' : 'space-y-4'}>
            {label && (
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        {label}
                    </label>
                    {description && (
                        <p className="text-xs text-gray-500">{description}</p>
                    )}
                </div>
            )}

            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={value <= min}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Minus className="w-4 h-4 text-white" />
                </button>

                <div className="flex-1">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={handleSliderChange}
                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${percentage}%, rgba(255,255,255,0.05) ${percentage}%, rgba(255,255,255,0.05) 100%)`
                        }}
                    />
                </div>

                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={value >= max}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4 text-white" />
                </button>

                <div className="min-w-[60px] text-center">
                    <span className="text-2xl font-bold text-white">{value}</span>
                </div>
            </div>
        </div>
    )
}

export default NumberInput
