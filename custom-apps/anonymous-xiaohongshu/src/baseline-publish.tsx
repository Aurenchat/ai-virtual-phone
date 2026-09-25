// Direct fork of Float's original compose sheet, with iframe media/storage callbacks.
import React,{useRef,useState} from 'react';
import {Plus,ImagePlus,Loader2,Send} from 'lucide-react';
import type {XiaohongshuUserPostInput} from './xiaohongshu-types';
import {readImage} from './adapters/images';
export function PublishSheet({onClose,onPublish}:{onClose:()=>void;onPublish:(input:XiaohongshuUserPostInput,images:Record<string,string>)=>Promise<void>}){
 const [draft,setDraft]=useState<XiaohongshuUserPostInput>({title:'',body:'',tags:[],image:{}});
 const [tagInput,setTagInput]=useState(''),[busy,setBusy]=useState('idle'),[error,setError]=useState('');
 const fileRef=useRef<HTMLInputElement>(null);
 const setComposeOpen=(_:boolean)=>onClose();
 async function handleImageChange(event:React.ChangeEvent<HTMLInputElement>){try{const files=[...event.target.files||[]];if(files.length+(draft.images?.length||0)>4)throw Error('最多 4 张图片');const added=await Promise.all(files.map(async file=>({assetId:'img_'+crypto.randomUUID().replaceAll('-',''),dataUrl:await readImage(file)})));setDraft(d=>({...d,images:[...d.images||[],...added]}));}catch(e){setError(String(e));}}
 async function handlePublish(){setBusy('publish');try{await onPublish({...draft,tags:tagInput.split(/[,，\\s#]+/).filter(Boolean)},Object.fromEntries((draft.images||[]).map(i=>[i.assetId!,i.dataUrl!])));onClose();}catch(e){setError(String(e));}finally{setBusy('idle');}}
 return <>
 {error&&<div className="anon-error" role="alert">{error}</div>}
        <div className="xhs-modal-backdrop" onClick={() => setComposeOpen(false)}>
          <section className="xhs-publish-sheet" onClick={event => event.stopPropagation()}>
            <header>
              <strong>发布新笔记</strong>
              <button type="button" className="xhs-sheet-close-btn" onClick={() => setComposeOpen(false)} aria-label="关闭">×</button>
            </header>
            <div className="xhs-publish-content">
              <div className="xhs-publish-left">
                {((draft.images && draft.images.length > 0) || draft.image?.dataUrl) ? (
                  <div className="xhs-publish-multi-images">
                    <div className="xhs-publish-images-grid">
                      {(draft.images || [draft.image!]).map((img, idx) => (
                        <div key={img.assetId || idx} className="xhs-publish-grid-item">
                          <img src={img.dataUrl} alt={`Preview ${idx + 1}`} />
                          <button
                            type="button"
                            className="xhs-publish-img-remove"
                            onClick={() => {
                              setDraft((prev) => {
                                const list = (prev.images || [prev.image!]).filter((_, i) => i !== idx);
                                return {
                                  ...prev,
                                  image: list[0] || {},
                                  images: list.length > 0 ? list : undefined,
                                };
                              });
                            }}
                            aria-label="删除图片"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="xhs-publish-grid-add"
                        onClick={() => fileRef.current?.click()}
                        aria-label="继续添加图片"
                      >
                        <Plus size={24} />
                        <span>添加</span>
                      </button>
                    </div>
                    <input aria-label="帖子图片" ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImageChange} />
                    <button
                      type="button"
                      className="xhs-upload-change-btn"
                      onClick={() => setDraft(prev => ({ ...prev, image: {}, images: undefined }))}
                    >
                      清空所有图片
                    </button>
                  </div>
                ) : draft.image?.description === undefined ? (
                  <div className="xhs-image-upload-area">
                    <div className="xhs-publish-placeholder">
                      <ImagePlus size={42} strokeWidth={1.5} color="#bbb" />
                      <div className="xhs-placeholder-actions">
                        <button type="button" onClick={() => fileRef.current?.click()}>上传图片 (支持多张)</button>
                        <button type="button" onClick={() => setDraft(prev => ({ ...prev, image: { ...prev.image, description: "" } }))}>描述图片</button>
                      </div>
                    </div>
                    <input aria-label="帖子图片" ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImageChange} />
                  </div>
                ) : (
                  <>
                    <div className="xhs-image-upload-area is-text-mode">
                      <div className="xhs-text-image-preview">
                        {draft.image.description?.trim() || "在此区域下方输入描述\n即可生成文字图片"}
                      </div>
                    </div>
                    <div className="xhs-publish-field">
                      <label>文字图片内容</label>
                      <textarea
                        placeholder="输入文字描述..."
                        value={draft.image.description || ""}
                        onChange={event => setDraft(prev => ({ ...prev, image: { ...prev.image, description: event.target.value } }))}
                        autoFocus
                      />
                    </div>
                    <button type="button" className="xhs-upload-change-btn" onClick={() => setDraft(prev => ({ ...prev, image: {} }))}>
                      取消并重新选择
                    </button>
                  </>
                )}
              </div>
              <div className="xhs-publish-right">
                <input
                  className="xhs-publish-title-input"
                  aria-label="笔记标题" placeholder="填写标题会有更多赞哦~"
                  value={draft.title}
                  onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))}
                />
                <textarea
                  className="xhs-publish-body-input"
                  aria-label="笔记正文" placeholder="添加正文，和大家分享你的见闻..."
                  value={draft.body}
                  onChange={event => setDraft(prev => ({ ...prev, body: event.target.value }))}
                />
                <div className="xhs-publish-tag-input">
                  <span>#</span>
                  <input
                    value={tagInput}
                    onChange={event => setTagInput(event.target.value)}
                    placeholder="添加标签，用空格或逗号分隔"
                  />
                </div>
                <div className="xhs-publish-actions">
                  <button type="button" className="xhs-publish-submit-btn" onClick={handlePublish} disabled={busy !== "idle" || (!draft.title.trim() && !draft.body.trim())}>
                    {busy === "publish" ? <Loader2 className="cp-spin" size={18} /> : <Send size={18} />}
                    发布笔记
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
 </>;
}
