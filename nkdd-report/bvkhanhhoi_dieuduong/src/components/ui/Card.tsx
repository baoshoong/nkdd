import * as React from 'react'
import { cn } from '@/lib/theme/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

function Card({ className, hover = false, children, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_4px_20px_rgba(100,100,180,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-5 transition-all duration-150',
        hover &&
          'hover:shadow-[0_8px_28px_rgba(100,100,180,0.10)] hover:border-[#D4D5E4] dark:hover:border-[#3E4268]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        'font-bold text-base text-[#1F2050] dark:text-[#F0F1F9] tracking-tight',
        className
      )}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium', className)}
      {...props}
    />
  )
}

function CardAction({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-action"
      className={cn('flex items-center justify-end', className)}
      {...props}
    />
  )
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-content" className={cn('', className)} {...props} />
  )
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center pt-4 border-t border-[#E8E8F2] dark:border-[#2A2C49]', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent
}
