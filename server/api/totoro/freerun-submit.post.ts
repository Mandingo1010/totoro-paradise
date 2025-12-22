/**
 * 自由跑提交API - 在服务器端处理提交
 * 这样即使客户端关闭浏览器，提交过程也会继续
 */

import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper'
import { FreeRunDataGenerator } from '~/src/classes/FreeRunDataGenerator'
import generateRoute from '~/src/utils/generateRoute'

interface FreeRunSubmitRequest {
    // Session data
    token: string
    schoolId: string
    campusId: string
    stuNumber: string

    // Run parameters
    distance: string
    avgSpeed: string
    duration: string
    calorie: string
    steps: string
    avgPace: string
    startTime: string
    endTime: string
    mac: string
    deviceInfo: string

    // Route info
    routeId?: string
    taskId?: string
    routePoints?: Array<{ longitude: string; latitude: string }>
}

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody<FreeRunSubmitRequest>(event)

        // Validate required fields
        if (!body.token || !body.stuNumber) {
            throw new Error('Missing required fields: token or stuNumber')
        }

        console.log('[Server] Starting FreeRun submission for student:', body.stuNumber)

        // Step 1: Call getRunBegin
        console.log('[Server] Step 1: Calling getRunBegin...')
        await TotoroApiWrapper.getRunBegin({
            campusId: body.campusId,
            schoolId: body.schoolId,
            stuNumber: body.stuNumber,
            token: body.token,
        })
        console.log('[Server] getRunBegin completed')

        // Step 2: Submit run data
        console.log('[Server] Step 2: Submitting run data...')
        const freeRunRequest = {
            token: body.token,
            schoolId: body.schoolId,
            campusId: body.campusId,
            stuNumber: body.stuNumber,
            distance: body.distance,
            duration: body.duration,
            avgSpeed: body.avgSpeed,
            avgPace: body.avgPace,
            calorie: body.calorie,
            steps: body.steps,
            startTime: body.startTime,
            endTime: body.endTime,
            mac: body.mac,
            deviceInfo: body.deviceInfo,
            runType: '1' as const, // Free run identifier
            routeId: body.routeId || 'freerun_' + Date.now(),
            taskId: body.taskId || 'freerun_task_' + Date.now(),
        }

        const response = await TotoroApiWrapper.submitFreeRun(freeRunRequest)

        if (response && response.status === '00') {
            const scantronId = (response as any).scantronId || (response as any).data?.recordId

            // Step 3: Submit route details if we have route points
            if (scantronId && body.routePoints && body.routePoints.length > 0) {
                try {
                    console.log('[Server] Step 3: Submitting route details with', body.routePoints.length, 'points...')

                    await TotoroApiWrapper.sunRunExercisesDetail({
                        pointList: body.routePoints,
                        scantronId: scantronId,
                        breq: {
                            campusId: body.campusId,
                            schoolId: body.schoolId,
                            stuNumber: body.stuNumber,
                            token: body.token,
                        },
                    })
                    console.log('[Server] Route details submitted successfully')
                } catch (detailError) {
                    console.warn('[Server] Failed to submit route details:', detailError)
                    // Don't throw - main record is already submitted
                }
            }

            console.log('[Server] FreeRun submission completed successfully')
            return {
                success: true,
                recordId: scantronId,
                message: '跑步数据已成功提交',
            }
        } else {
            const errorMsg = (response as any)?.message || '服务器返回错误'
            throw new Error(errorMsg)
        }
    } catch (error) {
        console.error('[Server] Error in FreeRun submission:', error)
        const errorMessage = error instanceof Error ? error.message : '提交失败'

        return {
            success: false,
            error: errorMessage,
            message: '跑步数据提交失败: ' + errorMessage,
        }
    }
})
