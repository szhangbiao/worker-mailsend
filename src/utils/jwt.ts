/**
 * JWT Utility Module
 * JWT 工具模块
 * 
 * 用于 Google Service Account 认证
 * 实现 RS256 签名算法和 JWT token 生成
 */

/**
 * JWT Header
 */
interface JWTHeader {
    alg: 'RS256';
    typ: 'JWT';
}

/**
 * JWT Payload for Google Service Account
 */
interface JWTPayload {
    iss: string;        // Service Account email
    scope: string;      // OAuth2 scopes
    aud: string;        // Token endpoint
    exp: number;        // Expiration time (Unix timestamp)
    iat: number;        // Issued at time (Unix timestamp)
    sub?: string;       // Subject (user to impersonate for domain-wide delegation)
}

/**
 * Base64URL 编码
 * 将 ArrayBuffer 转换为 Base64URL 格式
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // 转换为 Base64URL: 替换 +/= 字符
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * 将字符串编码为 Base64URL
 */
function stringToBase64Url(str: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    // 类型断言: Uint8Array.buffer 返回 ArrayBuffer
    return base64UrlEncode(data.buffer as ArrayBuffer);
}

/**
 * 将 PEM 格式的私钥转换为 ArrayBuffer
 * 移除 PEM 头尾和换行符,然后进行 Base64 解码
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
    // 移除 PEM 头尾
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';

    let pemContents = pem
        .replace(pemHeader, '')
        .replace(pemFooter, '')
        // 处理转义的换行符 (\\n)
        .replace(/\\n/g, '')
        // 移除所有空白字符（包括空格、制表符、换行符等）
        .replace(/\s/g, '');

    // 验证 base64 内容是否有效
    if (!pemContents || pemContents.length === 0) {
        throw new Error('Private key is empty after removing PEM headers');
    }

    // 验证是否只包含有效的 base64 字符
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(pemContents)) {
        throw new Error('Private key contains invalid base64 characters');
    }

    try {
        // Base64 解码
        const binaryString = atob(pemContents);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to decode base64 private key: ${message}. Make sure the private key is in valid PEM format.`);
    }
}

/**
 * 导入 RSA 私钥
 * 将 PEM 格式的私钥导入为 CryptoKey 对象
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
    try {
        const keyData = pemToArrayBuffer(pem);

        return await crypto.subtle.importKey(
            'pkcs8',
            keyData,
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256',
            },
            false,
            ['sign']
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to import private key: ${message}`);
    }
}

/**
 * 使用 RS256 算法签名数据
 */
async function signRS256(data: string, privateKey: CryptoKey): Promise<string> {
    try {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        const signature = await crypto.subtle.sign(
            'RSASSA-PKCS1-v1_5',
            privateKey,
            dataBuffer
        );

        return base64UrlEncode(signature);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to sign data: ${message}`);
    }
}

/**
 * 生成 JWT Token
 * 
 * @param options JWT 生成选项
 * @returns 签名后的 JWT token
 */
export async function generateJWT(options: {
    clientEmail: string;
    privateKey: string;
    scope: string;
    subject?: string;
}): Promise<string> {
    const { clientEmail, privateKey, scope, subject } = options;

    try {
        // 1. 构造 JWT Header
        const header: JWTHeader = {
            alg: 'RS256',
            typ: 'JWT',
        };

        // 2. 构造 JWT Payload
        const now = Math.floor(Date.now() / 1000);
        const payload: JWTPayload = {
            iss: clientEmail,
            scope: scope,
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600, // 1 小时后过期
            iat: now,
        };

        // 如果指定了 subject,添加到 payload (用于域范围委派)
        if (subject) {
            payload.sub = subject;
        }

        // 3. Base64URL 编码 Header 和 Payload
        const encodedHeader = stringToBase64Url(JSON.stringify(header));
        const encodedPayload = stringToBase64Url(JSON.stringify(payload));

        // 4. 构造待签名数据
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        // 5. 导入私钥
        const cryptoKey = await importPrivateKey(privateKey);

        // 6. 签名
        const signature = await signRS256(signingInput, cryptoKey);

        // 7. 构造完整的 JWT
        const jwt = `${signingInput}.${signature}`;

        return jwt;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to generate JWT: ${message}`);
    }
}
