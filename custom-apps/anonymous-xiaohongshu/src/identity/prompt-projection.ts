// ANON-FORK: rewrite only identity semantics at the model boundary, not native block protocols.
// User-editable native prompt templates are stored unchanged by the original settings panel.
export function projectPromptIdentity(text:string,triggerName:string){
 return text
  .replace(/\{\{\s*user\s*\}\}/gi,triggerName)
  .replaceAll('以下名字属于真实角色或用户','以下名字属于已存在的独立 social_account')
  .replaceAll("the user's nickname, Xiaohongshu ID, profile name, configured persona name",'the named social account or its recorded display-name aliases')
  .replaceAll('[用户昵称]','[发言账号]')
  .replaceAll('用户资料上下文：','当前 social_account 的公开资料：')
  .replaceAll('用户当前关注的小红书账号：',triggerName+' 当前关注的小红书账号：')
  .replaceAll('[用户IP属地]','[公开IP属地]')
  .replaceAll('[被@角色]','[被@账号]');
}
