import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Hàm kết hợp className an toàn với Tailwind CSS
export const cn = (...args: ClassValue[]) => twMerge(clsx(args))
