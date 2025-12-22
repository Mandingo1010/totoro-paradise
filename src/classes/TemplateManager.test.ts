import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateManager } from './TemplateManager';
import type { FreeRunParams, RunTemplate } from '../types/requestTypes/FreeRunRequest';

describe('TemplateManager', () => {
    let templateManager: TemplateManager;

    beforeEach(() => {
        templateManager = new TemplateManager();
    });

    describe('预设模板功能', () => {
        it('应该初始化三个预设模板', () => {
            const templates = templateManager.getAvailableTemplates();
            expect(templates).toHaveLength(3);

            const templateIds = templates.map(t => t.id);
            expect(templateIds).toContain('easy-run');
            expect(templateIds).toContain('standard-run');
            expect(templateIds).toContain('challenge-run');
        });

        it('轻松跑模板应该有正确的参数设置', () => {
            // 需求 8.3: 轻松跑模板设置3公里距离和6-8公里/小时速度
            const easyRun = templateManager.getTemplate('easy-run');
            expect(easyRun).toBeDefined();
            expect(easyRun!.name).toBe('轻松跑');
            expect(easyRun!.defaultParams.distance).toBe(3);
            expect(easyRun!.defaultParams.avgSpeed).toBe(7);
            expect(easyRun!.speedRange).toEqual([6, 8]);
        });

        it('标准跑模板应该有正确的参数设置', () => {
            // 需求 8.4: 标准跑模板设置5公里距离和8-12公里/小时速度
            const standardRun = templateManager.getTemplate('standard-run');
            expect(standardRun).toBeDefined();
            expect(standardRun!.name).toBe('标准跑');
            expect(standardRun!.defaultParams.distance).toBe(5);
            expect(standardRun!.defaultParams.avgSpeed).toBe(10);
            expect(standardRun!.speedRange).toEqual([8, 12]);
        });

        it('挑战跑模板应该有正确的参数设置', () => {
            // 需求 8.5: 挑战跑模板设置10公里距离和10-15公里/小时速度
            const challengeRun = templateManager.getTemplate('challenge-run');
            expect(challengeRun).toBeDefined();
            expect(challengeRun!.name).toBe('挑战跑');
            expect(challengeRun!.defaultParams.distance).toBe(10);
            expect(challengeRun!.defaultParams.avgSpeed).toBe(12.5);
            expect(challengeRun!.speedRange).toEqual([10, 15]);
        });
    });

    describe('模板应用功能', () => {
        it('应该能够应用轻松跑模板', () => {
            // 需求 8.3: 用户选择轻松跑模板时设置对应参数
            const params = templateManager.applyTemplate('easy-run');
            expect(params.distance).toBe(3);
            expect(params.avgSpeed).toBe(7);
            expect(params.template?.id).toBe('easy-run');
        });

        it('应该能够应用标准跑模板', () => {
            // 需求 8.4: 用户选择标准跑模板时设置对应参数
            const params = templateManager.applyTemplate('standard-run');
            expect(params.distance).toBe(5);
            expect(params.avgSpeed).toBe(10);
            expect(params.template?.id).toBe('standard-run');
        });

        it('应该能够应用挑战跑模板', () => {
            // 需求 8.5: 用户选择挑战跑模板时设置对应参数
            const params = templateManager.applyTemplate('challenge-run');
            expect(params.distance).toBe(10);
            expect(params.avgSpeed).toBe(12.5);
            expect(params.template?.id).toBe('challenge-run');
        });

        it('应用不存在的模板时应该抛出错误', () => {
            expect(() => {
                templateManager.applyTemplate('non-existent');
            }).toThrow('模板 non-existent 不存在');
        });
    });

    describe('自定义模板创建', () => {
        it('应该能够创建自定义模板', () => {
            // 需求 8.1: 添加自定义模板创建和管理功能
            const customParams: FreeRunParams = {
                distance: 7,
                avgSpeed: 9
            };

            const customTemplate = templateManager.createCustomTemplate(
                '我的自定义跑',
                customParams,
                '个人定制的跑步模式'
            );

            expect(customTemplate.name).toBe('我的自定义跑');
            expect(customTemplate.description).toBe('个人定制的跑步模式');
            expect(customTemplate.defaultParams.distance).toBe(7);
            expect(customTemplate.defaultParams.avgSpeed).toBe(9);
            expect(customTemplate.id).toMatch(/^custom-/);
        });

        it('创建模板时应该自动计算速度和距离范围', () => {
            const customParams: FreeRunParams = {
                distance: 6,
                avgSpeed: 10
            };

            const customTemplate = templateManager.createCustomTemplate('测试模板', customParams);

            // 速度范围应该是 ±20%
            expect(customTemplate.speedRange[0]).toBeCloseTo(8, 1);
            expect(customTemplate.speedRange[1]).toBeCloseTo(12, 1);

            // 距离范围应该是 ±30%
            expect(customTemplate.distanceRange[0]).toBeCloseTo(4.2, 1);
            expect(customTemplate.distanceRange[1]).toBeCloseTo(7.8, 1);
        });

        it('创建模板时名称不能为空', () => {
            const customParams: FreeRunParams = {
                distance: 5,
                avgSpeed: 8
            };

            expect(() => {
                templateManager.createCustomTemplate('', customParams);
            }).toThrow('模板名称不能为空');

            expect(() => {
                templateManager.createCustomTemplate('   ', customParams);
            }).toThrow('模板名称不能为空');
        });

        it('创建模板时必须包含有效距离', () => {
            const invalidParams: FreeRunParams = {
                distance: 0
            };

            expect(() => {
                templateManager.createCustomTemplate('测试', invalidParams);
            }).toThrow('模板必须包含有效的距离参数');
        });
    });

    describe('自定义模板管理', () => {
        let customTemplateId: string;

        beforeEach(() => {
            const customParams: FreeRunParams = {
                distance: 4,
                avgSpeed: 8
            };
            const template = templateManager.createCustomTemplate('测试模板', customParams);
            customTemplateId = template.id;
        });

        it('应该能够删除自定义模板', () => {
            const result = templateManager.deleteCustomTemplate(customTemplateId);
            expect(result).toBe(true);

            const template = templateManager.getTemplate(customTemplateId);
            expect(template).toBeUndefined();
        });

        it('不应该能够删除预设模板', () => {
            expect(() => {
                templateManager.deleteCustomTemplate('easy-run');
            }).toThrow('不能删除预设模板');

            expect(() => {
                templateManager.deleteCustomTemplate('standard-run');
            }).toThrow('不能删除预设模板');

            expect(() => {
                templateManager.deleteCustomTemplate('challenge-run');
            }).toThrow('不能删除预设模板');
        });

        it('应该能够更新自定义模板', () => {
            const updates = {
                name: '更新后的模板',
                description: '更新后的描述'
            };

            const updatedTemplate = templateManager.updateCustomTemplate(customTemplateId, updates);
            expect(updatedTemplate.name).toBe('更新后的模板');
            expect(updatedTemplate.description).toBe('更新后的描述');
            expect(updatedTemplate.id).toBe(customTemplateId); // ID不应该改变
        });

        it('不应该能够更新预设模板', () => {
            expect(() => {
                templateManager.updateCustomTemplate('easy-run', { name: '新名称' });
            }).toThrow('不能修改预设模板');
        });
    });

    describe('模板分类和推荐', () => {
        it('应该能够区分预设模板和自定义模板', () => {
            // 创建一个自定义模板
            const customParams: FreeRunParams = {
                distance: 6,
                avgSpeed: 9
            };
            templateManager.createCustomTemplate('自定义模板', customParams);

            const presetTemplates = templateManager.getPresetTemplates();
            const customTemplates = templateManager.getCustomTemplates();

            expect(presetTemplates).toHaveLength(3);
            expect(customTemplates).toHaveLength(1);
            expect(presetTemplates.every(t => ['easy-run', 'standard-run', 'challenge-run'].includes(t.id))).toBe(true);
            expect(customTemplates[0].name).toBe('自定义模板');
        });

        it('应该能够根据距离推荐合适的模板', () => {
            // 3公里应该推荐轻松跑
            const recommendations1 = templateManager.recommendTemplate(3);
            expect(recommendations1.some(t => t.id === 'easy-run')).toBe(true);

            // 5公里应该推荐标准跑
            const recommendations2 = templateManager.recommendTemplate(5);
            expect(recommendations2.some(t => t.id === 'standard-run')).toBe(true);

            // 10公里应该推荐挑战跑
            const recommendations3 = templateManager.recommendTemplate(10);
            expect(recommendations3.some(t => t.id === 'challenge-run')).toBe(true);
        });

        it('应该能够根据距离和速度推荐模板', () => {
            // 3公里，7公里/小时应该推荐轻松跑
            const recommendations = templateManager.recommendTemplate(3, 7);
            expect(recommendations.some(t => t.id === 'easy-run')).toBe(true);
            expect(recommendations.every(t => t.id !== 'challenge-run')).toBe(true);
        });
    });

    describe('模板验证', () => {
        it('应该验证有效的模板', () => {
            const validTemplate: RunTemplate = {
                id: 'test-template',
                name: '测试模板',
                description: '测试用模板',
                defaultParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                speedRange: [8, 12],
                distanceRange: [3, 8]
            };

            const validation = templateManager.validateTemplate(validTemplate);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it('应该检测无效的模板', () => {
            const invalidTemplate: RunTemplate = {
                id: '',
                name: '',
                description: '测试',
                defaultParams: {
                    distance: 0,
                    avgSpeed: -5
                },
                speedRange: [12, 8], // 无效范围
                distanceRange: [8, 3] // 无效范围
            };

            const validation = templateManager.validateTemplate(invalidTemplate);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.errors).toContain('模板ID不能为空');
            expect(validation.errors).toContain('模板名称不能为空');
            expect(validation.errors).toContain('默认距离必须大于0');
        });
    });
});