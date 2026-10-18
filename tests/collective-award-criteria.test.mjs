import test from "node:test";
import assert from "node:assert/strict";
import { AWARD_CRITERIA } from "../lib/award-criteria.ts";
import { COLLECTIVE_AWARD_CRITERIA } from "../lib/collective-award-criteria.ts";
import {
  COLLECTIVE_CODES, LEGACY_COLLECTIVE_CODES, INDIVIDUAL_CODES,
  getAwardCriteria, getApplicableCriterionCodes, getApplicationCriterionCodes,
  getCriterionDefinition, getCriterionDisplayCode, isLegacyCollectiveCriterion,
} from "../lib/award-criteria-scope.ts";
import { validateCriteria } from "../lib/criteria-rules.ts";
import { criterionCategory, categoryCriterion, validateCriterionEvidence } from "../lib/criterion-evidence.ts";
import { validateEvidenceEntryLedger } from "../lib/evidence-entry-rules.ts";

test("cá nhân giữ đầy đủ C1–C9, bao gồm các điều kiện riêng C7–C9", () => {
  assert.equal(getAwardCriteria("individual"), AWARD_CRITERIA);
  assert.deepEqual([...getApplicableCriterionCodes("individual")], [...INDIVIDUAL_CODES]);
  assert.match(getCriterionDefinition("individual","C8").description,/2,80\/4,00/);
});

test("tập thể mới có sáu tiêu chí T1–T6 độc lập trong dữ liệu và UI", () => {
  const list=getAwardCriteria("collective");
  assert.deepEqual(list.map(x=>x.code), [...COLLECTIVE_CODES]);
  assert.deepEqual([...getApplicableCriterionCodes("collective")], [...COLLECTIVE_CODES]);
  assert.equal(COLLECTIVE_AWARD_CRITERIA.length,6);
  assert.ok(list.every(x=>x.category==="multiple"&&x.reviewChecks.length>=2&&x.evidence.length>=2));
  assert.ok(list.every(x=>x.description.length>=60));
  assert.equal(getCriterionDefinition("collective","T1").title,list[0].title);
  assert.notEqual(list[4].title,AWARD_CRITERIA[4].title);
  assert.match(list[4].description,/không bắt buộc phải có giải thưởng/);
});

test("hồ sơ tập thể C1–C9 lịch sử không bị tự đổi sang T1–T6", () => {
  assert.deepEqual([...getApplicationCriterionCodes("collective",INDIVIDUAL_CODES)], [...LEGACY_COLLECTIVE_CODES]);
  assert.deepEqual([...getApplicationCriterionCodes("collective",COLLECTIVE_CODES)], [...COLLECTIVE_CODES]);
  assert.equal(isLegacyCollectiveCriterion("C1"),true);
  assert.equal(getCriterionDisplayCode("collective","C1",AWARD_CRITERIA[0].title),"C1");
  assert.equal(getCriterionDefinition("collective","C1",AWARD_CRITERIA[0].title),AWARD_CRITERIA[0]);
  assert.equal(getCriterionDisplayCode("collective","C1",COLLECTIVE_AWARD_CRITERIA[0].title),"T1");
  assert.equal(getCriterionDisplayCode("collective","T1"),"T1");
});

test("bộ tập thể mới dùng tên category Drive riêng criterion_t1..t6",()=>{
  for(const code of COLLECTIVE_CODES){
    assert.equal(categoryCriterion(criterionCategory(code)),code);
  }
  assert.deepEqual(validateCriterionEvidence(COLLECTIVE_CODES.map(criterionCategory),"collective",COLLECTIVE_CODES),[]);
  assert.match(validateCriterionEvidence(["criterion_c1"],"collective",COLLECTIVE_CODES).join(" "),/T1/);
  assert.match(validateCriterionEvidence([...COLLECTIVE_CODES.map(criterionCategory),"criterion_c1"],"collective",COLLECTIVE_CODES).join(" "),/không thuộc/);
});

test("mỗi hồ sơ có đúng bộ tiêu chí của nó, tất cả đều Đạt trước khi thông qua",()=>{
  const fresh=COLLECTIVE_CODES.map(code=>({code,status:"verified"}));
  assert.deepEqual(validateCriteria(fresh,"collective","pass"),[]);
  assert.match(validateCriteria(fresh.slice(1),"collective","submit").join(" "),/T1/);
  assert.match(validateCriteria([...fresh,{code:"C1",status:"verified"}],"collective","pass").join(" "),/không thuộc/);
  assert.deepEqual(validateCriteria(INDIVIDUAL_CODES.map(code=>({code,status:"verified"})),"collective","pass"),[]);
});

test("mục minh chứng tập thể mới chỉ gắn T-codes và không nhận C-code cũ",()=>{
  const entries=[{id:"x",criterion_code:"T1",title:"Hoàn thành kế hoạch năm học"}];
  const files=[{evidence_entry_id:"x",category:"criterion_t1"}];
  assert.deepEqual(validateEvidenceEntryLedger(entries,files,"collective",COLLECTIVE_CODES),[]);
  assert.match(validateEvidenceEntryLedger(
    [{id:"x",criterion_code:"C1",title:"Hoàn thành kế hoạch"}],
    [{evidence_entry_id:"x",category:"criterion_c1"}],"collective",COLLECTIVE_CODES).join(" "),/không thuộc/);
});

test("không thêm thang điểm hay trọng số không được phê duyệt",()=>{
  assert.ok(getAwardCriteria("collective").every(item=>!("weight" in item)&&!("minPercentage" in item)));
});
