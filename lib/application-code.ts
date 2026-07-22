export function makeApplicationCode() {
    const year = new Date().getFullYear();
    const stamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomUUID().slice(0, 4).toUpperCase();
    return `HS-CNTT-${year}-${stamp}-${random}`;
}

