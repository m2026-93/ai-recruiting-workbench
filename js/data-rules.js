(function () {
  var D = window.DATA;

  // 提醒规则：确定性规则检测，不调用大模型；仅生成提醒，不代替 HR 执行
  // cat: flow 流程卡点 / schedule 面试日程 / screening 初筛 / position 岗位进度 / comm 协作沟通
  D.RULES = [
    {
      id: "RULE-IF-24H", name: "面试反馈超时", cat: "flow",
      threshold: 24, unit: "小时", scope: "all", enabled: true,
      desc: "面试结束超过 24 小时，ATS 中仍无面试反馈记录",
      source: "interview_at · feedback_status",
      follow: "由 HR 联系面试官并在 ATS 补录结论（系统不代填）"
    },
    {
      id: "RULE-BF-48H", name: "业务部门反馈超时", cat: "flow",
      threshold: 48, unit: "小时", scope: "all", enabled: true,
      desc: "简历推荐给业务部门超过 48 小时，无「同意面试 / 暂不推进」结论",
      source: "stage_updated_at · biz_feedback",
      follow: "由 HR 与业务负责人约定回复时间"
    },
    {
      id: "RULE-IA-72H", name: "初筛通过未安排面试", cat: "schedule",
      threshold: 72, unit: "小时", scope: "all", enabled: true,
      desc: "候选人初筛通过超过 72 小时，仍未创建面试安排",
      source: "screening_result · interview_at",
      follow: "由 HR 协调面试官时间并发出面试邀约"
    },
    {
      id: "RULE-IV-2H", name: "今日面试待确认", cat: "schedule",
      threshold: 2, unit: "小时", scope: "all", enabled: true,
      desc: "距面试开始不足 2 小时，仍未确认面试官或场地",
      source: "interview_at · interview_room",
      follow: "由 HR 确认面试官、会议链接与候选人是否到场"
    },
    {
      id: "RULE-OF-48H", name: "Offer 审批超时", cat: "flow",
      threshold: 48, unit: "小时", scope: "all", enabled: true,
      desc: "Offer 提交审批超过 48 小时未出结论",
      source: "offer_status · offer_submitted_at",
      follow: "由 HR 跟进审批人；候选人侧沟通由 HR 自行判断"
    },
    {
      id: "RULE-ST-7D", name: "候选人阶段停留过久", cat: "flow",
      threshold: 7, unit: "天", scope: "all", enabled: true,
      desc: "同一候选人停留在同一阶段超过 7 天且无推进动作",
      source: "current_stage · stage_updated_at",
      follow: "由 HR 判断是否推进或归档"
    },
    {
      id: "RULE-SC-LOWPASS", name: "初筛通过率偏低", cat: "screening",
      threshold: 30, unit: "份样本 / 15%", scope: "all", enabled: true,
      desc: "单批次已处理简历 ≥ 30 份且高匹配占比 < 15%",
      source: "batch_stats.high_ratio",
      follow: "由 HR 复核筛选标准、抽查证据与简历来源"
    },
    {
      id: "RULE-HC-30D", name: "岗位开放超期未招满", cat: "position",
      threshold: 30, unit: "天 · HC 未满足", scope: "all", enabled: true,
      desc: "岗位开放超过 30 天且仍有 HC 缺口",
      source: "job_opened_at · headcount",
      follow: "由 HR 与业务方复盘渠道或标准"
    },
    {
      id: "RULE-DUP", name: "疑似重复投递", cat: "comm",
      threshold: 0, unit: "同人同手机号", scope: "all", enabled: true,
      desc: "同一候选人在 30 天内投递 2 个及以上岗位",
      source: "candidate_phone_hash",
      follow: "由 HR 判断是否复用已有初筛结论"
    }
  ];

  D.RULE_CATS = {
    flow: "流程卡点",
    schedule: "面试日程",
    screening: "初筛异常",
    position: "岗位进度",
    comm: "协作沟通"
  };
})();
