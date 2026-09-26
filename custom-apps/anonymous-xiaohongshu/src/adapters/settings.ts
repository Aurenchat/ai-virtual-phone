// CUSTOM-APP-ADAPTER: no native user identity, phone snapshot, preset or mixed memory is read.
import {userAccount} from './identity';
import {loadCharacters} from './characters';
import {kvGet} from './storage';
export function resolveUserIdentity(..._args:unknown[]){const a=userAccount();return a?{id:a.accountId,name:a.displayName,avatarUrl:a.avatar||''}:null;}
export function loadApiConfigs(){return [{id:'background',enableImageRecognition:true,defaultModel:''}];}
export function loadBindingConfig(){return {globalDefaults:{apiConfigId:'background'}};}
export function resolveBinding(..._args:unknown[]){return {apiConfigId:loadCharacters()[0]?.id||'background',worldBookIds:[],regexIds:[]};}
export function loadPresets(){return [];}
export function loadWorldBooks(){return [];}
export function loadRegexes(){return [];}
export const CHECKPHONE_SETTINGS_CHANGED_EVENT='anonymous-xhs-settings-changed';
export type CheckPhoneSettings={collapseBilingualTranslation:boolean};
export function loadCheckPhoneSettings():CheckPhoneSettings{return {collapseBilingualTranslation:JSON.parse(kvGet('ai_phone_xiaohongshu_state_v1')||'{}').settings?.collapseBilingualTranslation!==false};}
