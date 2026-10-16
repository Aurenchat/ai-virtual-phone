"use client";

import { useState, type CSSProperties } from "react";
import { Archive, Download, RefreshCw } from "lucide-react";
import { BINDING_ACCENTS } from "@/lib/ui-accent-colors";
import { downloadFile } from "@/lib/download-utils";
import {
    prepareCharacterMemoryExport,
    type CharacterMemoryExportResult,
} from "@/lib/memory-export";

type Props = {
    characterId: string;
    characterName: string;
    onNotice?: (message: string) => void;
};

/** Two taps intentionally preserve a fresh user gesture for iOS share sheet. */
export function MemoryExportSection({ characterId, characterName, onNotice }: Props) {
    const [includeInvalidated, setIncludeInvalidated] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [prepared, setPrepared] = useState<CharacterMemoryExportResult | null>(null);
    const [errorText, setErrorText] = useState("");

    const prepare = async () => {
        if (preparing) return;
        setPreparing(true);
        setPrepared(null);
        setErrorText("");
        try {
            const result = await prepareCharacterMemoryExport(characterId, characterName, includeInvalidated);
            setPrepared(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setErrorText(message);
            onNotice?.(`记忆导出准备失败：${message}`);
        } finally {
            setPreparing(false);
        }
    };

    const save = () => {
        if (!prepared) return;
        setErrorText("");
        // Call directly within this click event. A prebuilt ZIP avoids losing
        // iOS WebKit's user activation while waiting for IndexedDB/JSZip.
        void downloadFile(prepared.blob, prepared.filename).catch(error => {
            const message = error instanceof Error ? error.message : String(error);
            setErrorText(message);
            onNotice?.(`保存记忆文件失败：${message}`);
        });
    };

    return (
        <>
            <p className="menu-group-desc mx-2">角色记忆导出</p>
            <div className="menu-group">
                <div className="menu-item">
                    <span className="card-icon" style={{ "--icon-color": BINDING_ACCENTS.memory } as CSSProperties}>
                        <Archive size={22} strokeWidth={1.75} />
                    </span>
                    <div className="menu-label-group">
                        <span className="menu-label">导出 {characterName} 的长期与核心记忆</span>
                        <span className="menu-desc">ZIP 包含原始 JSON 与可读 TXT，不包含短期记录和其他角色</span>
                    </div>
                </div>
                <label className="menu-item cursor-pointer" style={{ gap: 10 }}>
                    <input
                        type="checkbox"
                        checked={includeInvalidated}
                        disabled={preparing}
                        onChange={event => {
                            setIncludeInvalidated(event.target.checked);
                            setPrepared(null);
                            setErrorText("");
                        }}
                    />
                    <div className="menu-label-group">
                        <span className="menu-label">包括已失效的历史记忆</span>
                        <span className="menu-desc">默认只导出记忆库当前有效的记录；勾选可保存旧来源记录</span>
                    </div>
                </label>
                <div className="px-4 pb-4 flex flex-col gap-2">
                    {!prepared ? (
                        <button type="button" className="ui-btn ui-btn-outline p-2.5 w-full" disabled={preparing} onClick={() => void prepare()}>
                            <Archive size={14} className="mr-1.5" />
                            {preparing ? "正在准备文件..." : "准备导出 ZIP"}
                        </button>
                    ) : (
                        <>
                            <p className="menu-desc">
                                已准备：长期 {prepared.longTermCount} 条，核心 {prepared.coreCount} 条。
                                这是 {new Date(prepared.exportedAt).toLocaleString("zh-CN")} 的快照。
                            </p>
                            <button type="button" className="ui-btn ui-btn-primary p-2.5 w-full" onClick={save}>
                                <Download size={14} className="mr-1.5" />保存 ZIP / 分享到文件
                            </button>
                            <button type="button" className="ui-btn ui-btn-outline p-2 w-full" onClick={() => void prepare()}>
                                <RefreshCw size={13} className="mr-1.5" />重新读取最新记忆
                            </button>
                        </>
                    )}
                    {errorText && <p role="alert" className="menu-desc" style={{ color: "#cc4141" }}>{errorText}</p>}
                </div>
            </div>
        </>
    );
}
