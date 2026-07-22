import Image from "next/image";
export function BrandLogo({ size = 48, className = "", priority = false, }: {
    size?: number;
    className?: string;
    priority?: boolean;
}) {
    return (<span className={`brand-logo ${className}`.trim()} style={{ width: size, height: size }} aria-hidden="true">
      <Image src="/brand/doan-logo.png" alt="" width={size} height={size} sizes={`${size}px`} priority={priority}/>
    </span>);
}

