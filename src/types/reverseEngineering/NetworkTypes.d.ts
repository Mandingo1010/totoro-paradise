// Network traffic analysis types for reverse engineering

export interface NetworkRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
    timestamp: number;
    id: string;
}

export interface NetworkResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
    timestamp: number;
    requestId: string;
}

export interface HttpTransaction {
    request: NetworkRequest;
    response?: NetworkResponse;
    duration?: number;
}

export interface PcapAnalysisResult {
    transactions: HttpTransaction[];
    totalRequests: number;
    totalResponses: number;
    timeRange: {
        start: number;
        end: number;
    };
}

export interface ApiEndpoint {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    description: string;
    sampleRequest?: any;
    sampleResponse?: any;
    frequency: number;
}

export interface RequestSchema {
    requiredFields: string[];
    optionalFields: string[];
    fieldTypes: Record<string, string>;
    validation: Record<string, ValidationRule>;
}

export interface ValidationRule {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    pattern?: string;
    min?: number;
    max?: number;
}

export interface EncryptionInfo {
    algorithm: string;
    keySize: number;
    padding: string;
    publicKey?: string;
    privateKey?: string;
}

export interface FreeRunApiSpec {
    endpoints: {
        submit: string;
        query: string;
        detail: string;
    };
    requestFormat: RequestSchema;
    responseFormat: RequestSchema;
    encryption: EncryptionInfo;
}