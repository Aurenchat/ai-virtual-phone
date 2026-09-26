import {host} from '../adapters/host';
import type {IdentityState} from './accounts';

// No language-model inference or cross-viewer search. Only a user's explicit confirmation.
export async function confirmDisclosure(s:IdentityState,viewerCharacterId:string,accountId:string,identity:string){
 if(!s.accounts[accountId]||!identity.trim())throw Error('请选择账号并填写已明确揭露的身份。');
 const scope={viewerCharacterId,sourceNamespace:'identity_disclosure',sourceEntityId:accountId};
 const {revision}=await host().memory.invalidateSource(scope);
 s.disclosures=s.disclosures.filter(d=>d.viewerCharacterId!==viewerCharacterId||d.accountId!==accountId);
 s.disclosures.push({viewerCharacterId,accountId,state:'explicitly_disclosed',identity:identity.trim(),revision});
 await host().memory.writeSource({...scope,expectedRevision:revision,evidenceId:'explicit-disclosure',content:'[匿名小红书] '+JSON.stringify({accountId,displayName:s.accounts[accountId].displayName,state:'explicitly_disclosed',identity:identity.trim()}),timeline:true});
}
export async function revokeDisclosure(s:IdentityState,viewerCharacterId:string,accountId:string){
 const {revision}=await host().memory.invalidateSource({viewerCharacterId,sourceNamespace:'identity_disclosure',sourceEntityId:accountId});
 s.disclosures=s.disclosures.filter(d=>d.viewerCharacterId!==viewerCharacterId||d.accountId!==accountId);
 s.disclosures.push({viewerCharacterId,accountId,state:'unknown',revision});
}
