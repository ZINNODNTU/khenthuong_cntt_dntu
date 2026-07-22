import { env } from "@/lib/env";
const REQUEST_TIMEOUT_MS = 55000;
const RESPONSE_PREVIEW_LIMIT = 240;
type StorageResponse<T> = {
    ok: boolean;
    data?: T;
    error?: string;
    code?: string;
};
export type StoredFile = {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    createdTime: string;
};
export type DownloadedFile = {
    base64: string;
    mimeType: string;
    fileName: string;
    size: number;
};
export type StorageHealth = {
    rootFolderId: string;
    rootFolderName: string;
    version: string;
};
export class StorageGatewayError extends Error {
    readonly code: string;
    readonly status?: number;
    readonly responsePreview?: string;
    constructor(message: string, options: {
        code: string;
        status?: number;
        responsePreview?: string;
    }) {
        super(message);
        this.name = "StorageGatewayError";
        this.code = options.code;
        this.status = options.status;
        this.responsePreview = options.responsePreview;
    }
}
function storageConfig() {
    const rawUrl = env.googleAppsScriptWebAppUrl().trim();
    const secret = env.googleAppsScriptSharedSecret().trim();
    let url: URL;
    try {
        url = new URL(rawUrl);
    }
    catch {
        throw new StorageGatewayError("URL kho ảnh không hợp lệ. Hãy dùng URL triển khai kết thúc bằng /exec.", { code: "STORAGE_URL_INVALID" });
    }
    if (url.protocol !== "https:") {
        throw new StorageGatewayError("URL kho ảnh phải sử dụng HTTPS.", {
            code: "STORAGE_URL_INSECURE",
        });
    }
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    const isPublicDeployment = /^\/macros\/s\/[^/]+\/exec$/.test(normalizedPath);
    const isWorkspaceDeployment = /^\/a\/macros\/[^/]+\/s\/[^/]+\/exec$/.test(normalizedPath);
    if (url.hostname !== "script.google.com" || (!isPublicDeployment && !isWorkspaceDeployment)) {
        throw new StorageGatewayError("URL kho ảnh chưa đúng định dạng triển khai. Hệ thống chấp nhận URL /macros/s/.../exec hoặc /a/macros/ten-mien/s/.../exec.", { code: "STORAGE_URL_INVALID" });
    }
    if (secret.length < 24) {
        throw new StorageGatewayError("Mã kết nối kho ảnh quá ngắn hoặc chưa được cấu hình đúng.", {
            code: "STORAGE_SECRET_INVALID",
        });
    }
    url.search = "";
    url.hash = "";
    return { url: url.toString(), secret };
}
function preview(raw: string) {
    return raw.replace(/\s+/g, " ").trim().slice(0, RESPONSE_PREVIEW_LIMIT);
}
function htmlResponseError(raw: string, status: number) {
    const normalized = raw.toLowerCase();
    if (normalized.includes("accounts.google.com") ||
        normalized.includes("servicelogin") ||
        normalized.includes("sign in") ||
        normalized.includes("đăng nhập")) {
        return new StorageGatewayError("Kho ảnh đang yêu cầu đăng nhập. Hãy triển khai Web App với quyền chạy bằng tài khoản sở hữu và cho phép mọi người truy cập.", { code: "STORAGE_DEPLOYMENT_PRIVATE", status });
    }
    if (normalized.includes("page not found") ||
        normalized.includes("file you have requested does not exist") ||
        normalized.includes("requested url was not found")) {
        return new StorageGatewayError("Không tìm thấy bản triển khai kho ảnh. Hãy kiểm tra lại Deployment ID và URL /exec.", { code: "STORAGE_DEPLOYMENT_NOT_FOUND", status });
    }
    return new StorageGatewayError("Kho ảnh trả về một trang HTML thay vì dữ liệu API. Thường do URL triển khai sai, bản triển khai chưa cập nhật hoặc quyền truy cập chưa để công khai.", { code: "STORAGE_HTML_RESPONSE", status, responsePreview: preview(raw) });
}
function mapGatewayError(message: string, code?: string, status?: number) {
    const normalized = message.toLowerCase();
    if (normalized.includes("shared secret") || normalized.includes("storage_shared_secret")) {
        return new StorageGatewayError("Mã kết nối giữa website và kho ảnh không khớp. Hãy dùng đúng giá trị STORAGE_SHARED_SECRET trong cấu hình vận hành.", { code: code || "STORAGE_SECRET_MISMATCH", status });
    }
    if (normalized.includes("drive_root_folder_id") || normalized.includes("setupstorage")) {
        return new StorageGatewayError("Kho ảnh chưa có thư mục lưu trữ. Hãy chạy hàm setupStorage() một lần và cấp quyền truy cập thư mục.", { code: code || "STORAGE_ROOT_NOT_CONFIGURED", status });
    }
    if (normalized.includes("access denied") || normalized.includes("permission") || normalized.includes("quyền")) {
        return new StorageGatewayError("Tài khoản triển khai chưa có quyền truy cập thư mục lưu ảnh. Hãy cấp lại quyền và cập nhật bản triển khai.", { code: code || "STORAGE_PERMISSION_DENIED", status });
    }
    if (normalized.includes("vượt quá giới hạn") || normalized.includes("too large")) {
        return new StorageGatewayError(message, { code: code || "STORAGE_FILE_TOO_LARGE", status });
    }
    return new StorageGatewayError(message || "Kho ảnh từ chối yêu cầu.", {
        code: code || "STORAGE_GATEWAY_REJECTED",
        status,
    });
}
async function callStorage<T>(payload: Record<string, unknown>): Promise<T> {
    const config = storageConfig();
    let response: Response;
    try {
        response = await fetch(config.url, {
            method: "POST",
            headers: {
                "content-type": "application/json; charset=UTF-8",
                accept: "application/json",
            },
            body: JSON.stringify({ ...payload, secret: config.secret }),
            cache: "no-store",
            redirect: "follow",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    }
    catch (error) {
        if (error instanceof StorageGatewayError)
            throw error;
        const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
        throw new StorageGatewayError(timedOut
            ? "Kho ảnh phản hồi quá thời gian cho phép. Hãy kiểm tra bản triển khai và dung lượng ảnh."
            : "Không thể kết nối đến kho ảnh. Hãy kiểm tra URL triển khai và kết nối mạng của máy chủ.", { code: timedOut ? "STORAGE_TIMEOUT" : "STORAGE_NETWORK_ERROR" });
    }
    const raw = await response.text();
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html") || raw.trimStart().startsWith("<")) {
        throw htmlResponseError(raw, response.status);
    }
    let parsed: StorageResponse<T>;
    try {
        parsed = JSON.parse(raw) as StorageResponse<T>;
    }
    catch {
        throw new StorageGatewayError("Kho ảnh phản hồi sai định dạng. Hãy cập nhật Code.gs và tạo phiên bản triển khai mới.", { code: "STORAGE_INVALID_JSON", status: response.status, responsePreview: preview(raw) });
    }
    if (!response.ok || !parsed.ok) {
        throw mapGatewayError(parsed.error || `Kho ảnh trả về lỗi ${response.status}.`, parsed.code, response.status);
    }
    if (parsed.data === undefined || parsed.data === null) {
        throw new StorageGatewayError("Kho ảnh không trả về dữ liệu cần thiết.", {
            code: "STORAGE_EMPTY_RESPONSE",
            status: response.status,
        });
    }
    return parsed.data;
}
export async function uploadEvidence(params: {
    applicationCode: string;
    category: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
}) {
    return callStorage<StoredFile>({
        action: "upload",
        applicationCode: params.applicationCode,
        category: params.category,
        fileName: params.fileName,
        mimeType: params.mimeType,
        base64: params.buffer.toString("base64"),
    });
}
export async function downloadEvidence(fileId: string) {
    return callStorage<DownloadedFile>({ action: "download", fileId });
}
export async function deleteEvidence(fileId: string) {
    try {
        await callStorage<{
            deleted: boolean;
        }>({ action: "delete", fileId });
    }
    catch {
        // Best-effort cleanup. The original error remains the source of truth.
    }
}
export async function checkStorageHealth() {
    return callStorage<StorageHealth>({ action: "health" });
}

