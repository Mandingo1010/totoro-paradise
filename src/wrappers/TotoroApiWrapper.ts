import ky from 'ky';
import type { Point } from '../types/RunPoint';
import type BasicRequest from '../types/requestTypes/BasicRequest';
import type GetSchoolMonthByTermRequest from '../types/requestTypes/GetSchoolMonthByTermRequest';
import type GetSchoolTermRequest from '../types/requestTypes/GetSchoolTermRequest';
import type GetSunRunArchDetailRequest from '../types/requestTypes/GetSunRunArchDetailRequest';
import type GetSunRunArchRequest from '../types/requestTypes/GetSunRunArchRequest';
import type SunRunExercisesDetailRequest from '../types/requestTypes/SunRunExercisesDetailRequest';
import type SunRunExercisesRequest from '../types/requestTypes/SunRunExercisesRequest';
import type UpdateAppVersionRequest from '../types/requestTypes/UpdateAppVersionRequest';
import type GetAppAdResponse from '../types/responseTypes/GetAppAdResponse';
import type GetAppFrontPageResponse from '../types/responseTypes/GetAppFrontPageResponse';
import type GetAppNoticeResponse from '../types/responseTypes/GetAppNoticeResponse';
import type GetAppSloganResponse from '../types/responseTypes/GetAppSloganResponse';
import type GetLesseeServerResponse from '../types/responseTypes/GetLesseeServerResponse';
import type GetRegisterUrlResponse from '../types/responseTypes/GetRegisterUrlResponse';
import type GetRunBeginResponse from '../types/responseTypes/GetRunBeginResponse';
import type GetSchoolMonthByTermResponse from '../types/responseTypes/GetSchoolMonthByTermResponse';
import type GetSchoolTermResponse from '../types/responseTypes/GetSchoolTermResponse';
import type GetSunRunArchDetailResponse from '../types/responseTypes/GetSunRunArchDetailResponse';
import type GetSunRunArchResponse from '../types/responseTypes/GetSunRunArchResponse';
import type GetSunRunPaperResponse from '../types/responseTypes/GetSunRunPaperResponse';
import type LoginResponse from '../types/responseTypes/LoginResponse';
import type SunRunExercisesDetailResponse from '../types/responseTypes/SunRunExercisesDetailResponse';
import type SunRunExercisesResponse from '../types/responseTypes/SunRunExercisesResponse';
import type UpdateAppVersionResponse from '../types/responseTypes/UpdateAppVersionResponse';
import type FreeRunRequest from '../types/requestTypes/FreeRunRequest';
import type { BatchRunParams } from '../types/requestTypes/FreeRunRequest';
import type FreeRunResponse from '../types/responseTypes/FreeRunResponse';
import type { FreeRunRecord, FreeRunDetail, BatchResponse } from '../types/responseTypes/FreeRunResponse';
import FreeRunErrorHandler, { NetworkError, ApiError } from '../classes/FreeRunErrorHandler';
import encryptRequestContent from '../utils/encryptRequestContent';

const TotoroApiWrapper = {
  client: ky.create({
    prefixUrl: '/api/totoro',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // "Content-Length": "0",
      Host: 'app.xtotoro.com',
      Connection: 'Keep-Alive',
      'Accept-Encoding': 'gzip',
      'User-Agent': 'okhttp/4.9.0',
    },
  }),

  errorHandler: new FreeRunErrorHandler(),

  async getRegisterUrl() {
    return this.client.post('platform/serverlist/getRegisterUrl').json<GetRegisterUrlResponse>();
  },

  async getLesseeServer(code: string) {
    return this.client
      .post('platform/serverlist/getLesseeServer', {
        body: encryptRequestContent({ code }),
      })
      .json<GetLesseeServerResponse>();
  },

  async getAppAd(code: string) {
    return this.client
      .post('platform/serverlist/getAppAd', {
        body: encryptRequestContent({ code }),
      })
      .json<GetAppAdResponse>();
  },

  async login({ token }: { token: string }) {
    return this.client
      .post('platform/login/login', {
        body: encryptRequestContent({
          code: '',
          latitude: '',
          loginWay: '',
          longitude: '',
          password: '',
          phoneNumber: '',
          token,
        }),
      })
      .json<LoginResponse>();
  },

  async getAppSlogan(req: BasicRequest): Promise<GetAppSloganResponse> {
    return this.client
      .post('platform/serverlist/getAppSlogan', {
        body: encryptRequestContent(req),
      })
      .json();
  },

  async getAppFrontPage(req: BasicRequest): Promise<GetAppFrontPageResponse> {
    return this.client
      .post('platform/login/getAppFrontPage', {
        body: encryptRequestContent(req),
      })
      .json();
  },

  async updateAppVersion(breq: BasicRequest): Promise<UpdateAppVersionResponse> {
    const req: UpdateAppVersionRequest & Record<string, string | number | null> = {
      campusId: breq.campusId,
      schoolId: breq.schoolId,
      token: breq.token,
      version: '1.2.14',
      deviceType: '2',
      stuNumber: breq.stuNumber,
    };
    return this.client
      .post('platform/serverlist/updateAppVersion', {
        body: encryptRequestContent(req),
      })
      .json();
  },

  async getAppNotice(req: BasicRequest): Promise<GetAppNoticeResponse> {
    return this.client
      .post('platform/serverlist/getAppNotice', {
        body: encryptRequestContent({ ...req, version: '' }),
      })
      .json();
  },

  async getSunRunPaper(req: BasicRequest): Promise<GetSunRunPaperResponse> {
    return this.client.post('sunrun/getSunrunPaper', { body: encryptRequestContent(req) }).json();
  },

  async getRunBegin(req: BasicRequest) {
    return await this.client
      .post('sunrun/getRunBegin', {
        body: encryptRequestContent(req),
      })
      .json<GetRunBeginResponse>();
  },

  async sunRunExercises(req: SunRunExercisesRequest): Promise<SunRunExercisesResponse> {
    return this.client
      .post('platform/recrecord/sunRunExercises', {
        body: encryptRequestContent(req),
      })
      .json();
  },

  async sunRunExercisesDetail({
    pointList,
    scantronId,
    breq,
  }: {
    pointList: Point[];
    scantronId: string;
    breq: BasicRequest;
  }) {
    const req: SunRunExercisesDetailRequest = {
      pointList,
      scantronId,
      stuNumber: breq.stuNumber,
      token: breq.token,
    };
    return this.client
      .post('platform/recrecord/sunRunExercisesDetail', { json: req })
      .json<SunRunExercisesDetailResponse>();
  },

  async getSchoolTerm(breq: BasicRequest): Promise<GetSchoolTermResponse> {
    const req: GetSchoolTermRequest & Record<string, string | number | null> = {
      schoolId: breq.schoolId,
      token: breq.token,
    };
    return this.client
      .post('platform/course/getSchoolTerm', { body: encryptRequestContent(req) })
      .json();
  },

  async getSchoolMonthByTerm(
    termId: string,
    breq: BasicRequest,
  ): Promise<GetSchoolMonthByTermResponse> {
    const req: GetSchoolMonthByTermRequest & Record<string, string | number | null> = {
      schoolId: breq.schoolId,
      stuNumber: breq.stuNumber,
      token: breq.token,
      termId,
    };
    return this.client
      .post('platform/course/getSchoolMonthByTerm', {
        body: encryptRequestContent(req),
      })
      .json();
  },

  async getSunRunArch(
    monthId: string,
    termId: string,
    breq: BasicRequest,
  ): Promise<GetSunRunArchResponse> {
    const req: GetSunRunArchRequest & Record<string, string | number | null> = {
      ...breq,
      runType: '0',
      monthId,
      termId,
    };
    return this.client
      .post('sunrun/getSunrunArch', {
        body: encryptRequestContent(req),
      })
      .json();
  },

  async getSunRunArchDetail(
    scoreId: string,
    breq: BasicRequest,
  ): Promise<GetSunRunArchDetailResponse> {
    const req: GetSunRunArchDetailRequest & Record<string, string> = {
      scoreId,
      token: breq.token,
    };
    return this.client
      .post('sunrun/getSunrunArchDetail', {
        body: encryptRequestContent(req),
      })
      .json();
  },

  // Free Run API Methods
  async submitFreeRun(data: FreeRunRequest & { routeId?: string; taskId?: string }): Promise<FreeRunResponse> {
    return this.errorHandler.handleApiCall(async () => {
      try {
        // 解析时间，转换为正确的格式
        const startDate = new Date(data.startTime);
        const endDate = new Date(data.endTime);

        // 格式化时间为 HH:mm:ss
        const formatTime = (date: Date) => {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const seconds = date.getSeconds().toString().padStart(2, '0');
          return `${hours}:${minutes}:${seconds}`;
        };

        // 格式化日期时间为 yyyy-MM-dd HH:mm:ss
        const formatDateTime = (date: Date) => {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}-${month}-${day} ${formatTime(date)}`;
        };

        // 计算用时并格式化为 HH:mm:ss
        const durationSeconds = parseInt(data.duration);
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;
        const usedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // 使用传入的 routeId 和 taskId，如果没有则生成默认值
        const routeId = data.routeId || 'freerun_' + Date.now();
        const taskId = data.taskId || 'freerun_task_' + Date.now();

        // 转换为完整的 SunRunExercisesRequest 格式
        // runType: '0' = 阳光跑, '1' = 自由跑/累计跑步
        const fullRequest: SunRunExercisesRequest = {
          LocalSubmitReason: '',
          avgSpeed: data.avgSpeed,
          baseStation: '',
          endTime: formatTime(endDate),  // HH:mm:ss 格式
          evaluateDate: formatDateTime(endDate),  // yyyy-MM-dd HH:mm:ss 格式
          fitDegree: '1',
          flag: '1',
          headImage: '',
          ifLocalSubmit: '0',
          km: data.distance,
          mac: data.mac,
          phoneInfo: data.deviceInfo || '$CN11/iPhone15,4/17.4.1',
          phoneNumber: '',
          pointList: '',
          routeId: routeId,  // 使用真实的路线ID
          runType: '1',  // '1' = 自由跑/累计跑步（独立于阳光跑）
          sensorString: '',
          startTime: formatTime(startDate),  // HH:mm:ss 格式
          steps: data.steps,
          stuNumber: data.stuNumber,
          taskId: taskId,  // 使用真实的任务ID
          token: data.token,
          usedTime: usedTime,  // HH:mm:ss 格式
          version: '1.2.14',
          warnFlag: '0',
          warnType: '',
          faceData: '',
        };

        // 自由跑复用阳光跑的API端点
        const response = await this.client
          .post('platform/recrecord/sunRunExercises', {
            body: encryptRequestContent(fullRequest),
          })
          .json<FreeRunResponse>();

        // Check for API-level errors in response (status !== '00' indicates error)
        if (response.status !== '00' && response.message) {
          throw new ApiError(response.message, response.code || 'API_ERROR');
        }

        return response;
      } catch (error) {
        if (error instanceof Error) {
          // Transform HTTP errors to our error types
          if (error.message.includes('401')) {
            throw new ApiError('认证失败，请重新登录', 'INVALID_TOKEN', 401);
          } else if (error.message.includes('400')) {
            throw new ApiError('请求参数错误', 'INVALID_PARAMS', 400);
          } else if (error.message.includes('500')) {
            throw new ApiError('服务器内部错误', 'SERVER_ERROR', 500);
          } else if (error.message.includes('timeout') || error.message.includes('fetch')) {
            throw new NetworkError(error.message);
          }
        }
        throw error;
      }
    }, 'submitFreeRun');
  },

  async getFreeRunRecords(breq: BasicRequest, filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{ data: FreeRunRecord[] }> {
    return this.errorHandler.handleApiCall(async () => {
      const req = {
        ...breq,
        runType: '1', // 自由跑标识
        ...filters,
      };

      try {
        // 使用正确的路径 recrecord (不是 recreord)
        const response = await this.client
          .post('platform/recrecord/getFreeRunRecords', {
            body: encryptRequestContent(req),
          })
          .json<{ data: FreeRunRecord[]; status: string; message?: string; code?: string }>();

        if (response.status !== '00' && response.message) {
          throw new ApiError(response.message, response.code || 'API_ERROR');
        }

        return { data: response.data || [] };
      } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
          throw new ApiError('认证失败，请重新登录', 'INVALID_TOKEN', 401);
        }
        throw error;
      }
    }, 'getFreeRunRecords');
  },

  async getFreeRunDetail(recordId: string, breq: BasicRequest): Promise<{ data: FreeRunDetail }> {
    return this.errorHandler.handleApiCall(async () => {
      const req = {
        recordId,
        token: breq.token,
      };

      try {
        // 使用正确的路径 recrecord (不是 recreord)
        const response = await this.client
          .post('platform/recrecord/getFreeRunDetail', {
            body: encryptRequestContent(req),
          })
          .json<{ data: FreeRunDetail; status: string; message?: string; code?: string }>();

        if (response.status !== '00' && response.message) {
          throw new ApiError(response.message, response.code || 'API_ERROR');
        }

        if (!response.data) {
          throw new ApiError('记录不存在或已被删除', 'RECORD_NOT_FOUND', 404);
        }

        return { data: response.data };
      } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
          throw new ApiError('认证失败，请重新登录', 'INVALID_TOKEN', 401);
        }
        throw error;
      }
    }, 'getFreeRunDetail');
  },

  async submitBatchRuns(dataList: FreeRunRequest[], options?: {
    concurrency?: number;
    delayMs?: number;
  }): Promise<BatchResponse> {
    return this.errorHandler.handleApiCall(async () => {
      const concurrency = options?.concurrency || 3;
      const delayMs = options?.delayMs || 1000;

      const results: BatchResponse['results'] = [];
      let successCount = 0;
      let failureCount = 0;

      // Process in batches to control concurrency
      for (let i = 0; i < dataList.length; i += concurrency) {
        const batch = dataList.slice(i, i + concurrency);

        const batchPromises = batch.map(async (data, batchIndex) => {
          const globalIndex = i + batchIndex;
          try {
            // Add delay between requests to avoid rate limiting
            if (globalIndex > 0) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            const response = await this.submitFreeRun(data);

            if (response.data) {
              successCount++;
              return {
                index: globalIndex,
                success: true,
                recordId: response.data.recordId,
              };
            } else {
              failureCount++;
              return {
                index: globalIndex,
                success: false,
                error: 'No data returned from server',
              };
            }
          } catch (error) {
            failureCount++;
            const errorHandler = new FreeRunErrorHandler();
            let errorMessage = 'Unknown error';

            if (error instanceof ApiError) {
              const errorResponse = errorHandler.handleApiError(error);
              errorMessage = errorResponse.message;
            } else if (error instanceof NetworkError) {
              const errorResponse = errorHandler.handleNetworkError(error);
              errorMessage = errorResponse.message;
            } else if (error instanceof Error) {
              errorMessage = error.message;
            }

            return {
              index: globalIndex,
              success: false,
              error: errorMessage,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      return {
        totalSubmitted: dataList.length,
        successCount,
        failureCount,
        results,
      };
    }, 'submitBatchRuns');
  },
};

export default TotoroApiWrapper;
