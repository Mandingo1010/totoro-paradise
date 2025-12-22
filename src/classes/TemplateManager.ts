import type { FreeRunParams, RunTemplate } from '../types/requestTypes/FreeRunRequest';

export class TemplateManager {
    private templates: Map<string, RunTemplate> = new Map();

    constructor() {
        this.initializeDefaultTemplates();
    }

    /**
     * 初始化预设模板
     * 需求 8.1, 8.2: 显示预设模板选项，包含三种模式
     */
    private initializeDefaultTemplates(): void {
        // 轻松跑模板 - 需求 8.3
        const easyRunTemplate: RunTemplate = {
            id: 'easy-run',
            name: '轻松跑',
            description: '适合日常锻炼，轻松完成的跑步模式',
            defaultParams: {
                distance: 3,
                avgSpeed: 7 // 6-8公里/小时的中间值
            },
            speedRange: [6, 8],
            distanceRange: [2, 5]
        };

        // 标准跑模板 - 需求 8.4
        const standardRunTemplate: RunTemplate = {
            id: 'standard-run',
            name: '标准跑',
            description: '标准强度的跑步训练，适合提升体能',
            defaultParams: {
                distance: 5,
                avgSpeed: 10 // 8-12公里/小时的中间值
            },
            speedRange: [8, 12],
            distanceRange: [3, 8]
        };

        // 挑战跑模板 - 需求 8.5
        const challengeRunTemplate: RunTemplate = {
            id: 'challenge-run',
            name: '挑战跑',
            description: '高强度跑步训练，挑战个人极限',
            defaultParams: {
                distance: 10,
                avgSpeed: 12.5 // 10-15公里/小时的中间值
            },
            speedRange: [10, 15],
            distanceRange: [8, 15]
        };

        this.templates.set(easyRunTemplate.id, easyRunTemplate);
        this.templates.set(standardRunTemplate.id, standardRunTemplate);
        this.templates.set(challengeRunTemplate.id, challengeRunTemplate);
    }

    /**
     * 获取所有可用模板
     * 需求 8.1: 显示预设模板选项
     */
    getAvailableTemplates(): RunTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * 根据ID获取模板
     */
    getTemplate(templateId: string): RunTemplate | undefined {
        return this.templates.get(templateId);
    }

    /**
     * 应用模板
     * 需求 8.3, 8.4, 8.5: 用户选择模板时设置对应参数
     */
    applyTemplate(templateId: string): FreeRunParams {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`模板 ${templateId} 不存在`);
        }

        // 返回模板的默认参数副本
        return {
            distance: template.defaultParams.distance,
            avgSpeed: template.defaultParams.avgSpeed,
            targetTime: template.defaultParams.targetTime,
            template: template
        };
    }

    /**
     * 创建自定义模板
     * 需求 8.1: 添加自定义模板创建和管理功能
     */
    createCustomTemplate(name: string, params: FreeRunParams, description?: string): RunTemplate {
        if (!name || name.trim().length === 0) {
            throw new Error('模板名称不能为空');
        }

        if (!params.distance || params.distance <= 0) {
            throw new Error('模板必须包含有效的距离参数');
        }

        // 生成唯一ID
        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 计算速度范围（基于提供的速度或默认范围）
        let speedRange: [number, number];
        if (params.avgSpeed) {
            const variation = params.avgSpeed * 0.2; // ±20%变化
            speedRange = [
                Math.max(3, params.avgSpeed - variation),
                Math.min(25, params.avgSpeed + variation)
            ];
        } else {
            speedRange = [6, 12]; // 默认范围
        }

        // 计算距离范围（基于提供的距离）
        const distanceVariation = params.distance * 0.3; // ±30%变化
        const distanceRange: [number, number] = [
            Math.max(0.5, params.distance - distanceVariation),
            Math.min(20, params.distance + distanceVariation)
        ];

        const customTemplate: RunTemplate = {
            id,
            name: name.trim(),
            description: description || `自定义模板：${name}`,
            defaultParams: {
                distance: params.distance,
                avgSpeed: params.avgSpeed,
                targetTime: params.targetTime
            },
            speedRange,
            distanceRange
        };

        this.templates.set(id, customTemplate);
        return customTemplate;
    }

    /**
     * 删除自定义模板
     */
    deleteCustomTemplate(templateId: string): boolean {
        // 不允许删除预设模板
        if (templateId === 'easy-run' || templateId === 'standard-run' || templateId === 'challenge-run') {
            throw new Error('不能删除预设模板');
        }

        return this.templates.delete(templateId);
    }

    /**
     * 更新自定义模板
     */
    updateCustomTemplate(templateId: string, updates: Partial<RunTemplate>): RunTemplate {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`模板 ${templateId} 不存在`);
        }

        // 不允许修改预设模板
        if (templateId === 'easy-run' || templateId === 'standard-run' || templateId === 'challenge-run') {
            throw new Error('不能修改预设模板');
        }

        const updatedTemplate: RunTemplate = {
            ...template,
            ...updates,
            id: templateId // 确保ID不被修改
        };

        this.templates.set(templateId, updatedTemplate);
        return updatedTemplate;
    }

    /**
     * 获取预设模板列表
     */
    getPresetTemplates(): RunTemplate[] {
        return [
            this.templates.get('easy-run')!,
            this.templates.get('standard-run')!,
            this.templates.get('challenge-run')!
        ];
    }

    /**
     * 获取自定义模板列表
     */
    getCustomTemplates(): RunTemplate[] {
        return Array.from(this.templates.values()).filter(
            template => !['easy-run', 'standard-run', 'challenge-run'].includes(template.id)
        );
    }

    /**
     * 根据距离和速度推荐模板
     */
    recommendTemplate(distance: number, avgSpeed?: number): RunTemplate[] {
        const recommendations: RunTemplate[] = [];

        for (const template of this.templates.values()) {
            const [minDistance, maxDistance] = template.distanceRange;
            const [minSpeed, maxSpeed] = template.speedRange;

            // 检查距离是否在范围内
            if (distance >= minDistance && distance <= maxDistance) {
                // 如果提供了速度，也检查速度范围
                if (avgSpeed === undefined || (avgSpeed >= minSpeed && avgSpeed <= maxSpeed)) {
                    recommendations.push(template);
                }
            }
        }

        return recommendations;
    }

    /**
     * 验证模板参数
     */
    validateTemplate(template: RunTemplate): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!template.id || template.id.trim().length === 0) {
            errors.push('模板ID不能为空');
        }

        if (!template.name || template.name.trim().length === 0) {
            errors.push('模板名称不能为空');
        }

        if (!template.defaultParams.distance || template.defaultParams.distance <= 0) {
            errors.push('默认距离必须大于0');
        }

        if (template.defaultParams.avgSpeed && template.defaultParams.avgSpeed <= 0) {
            errors.push('默认速度必须大于0');
        }

        if (template.speedRange[0] >= template.speedRange[1]) {
            errors.push('速度范围无效：最小值必须小于最大值');
        }

        if (template.distanceRange[0] >= template.distanceRange[1]) {
            errors.push('距离范围无效：最小值必须小于最大值');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}