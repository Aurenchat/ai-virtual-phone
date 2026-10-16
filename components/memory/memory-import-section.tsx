"use client";

import { useRef, useState, type CSSProperties } from "react";
import { FileInput, Upload, X } from "lucide-react";
import { BINDING_ACCENTS } from "@/lib/ui-accent-colors";
import {
    previewCharacterMemoryImport,
    commitCharacterMemoryImport,
    type MemoryImportPreview,
} from "@/lib/memory-import";

type Props = {
    characterId: string;
    characterName: string;
    onImported: () => void;
    onNotice?: (message: string) => void;
};

export function MemoryImportSection({ characterId, characterName, onImported, onNotice }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<MemoryImportPreview | null>(null);
    const [longTerm, setLongTerm] = useState(true);
    const [core, setCore] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState("");

    const choose = async (file: File | undefined) => {
        setPreview(null);
        setError("");
        setResult("");
        if (!file) return;
        setBusy(true);
        try { setPreview(await previewCharacterMemoryImport(file, characterId)); }
        catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        finally { setBusy(false); }
    };
    const execute = async () => {
        if (!preview || busy) return;
        setBusy(true);
        setError("");
        try {
            const outcome = await commitCharacterMemoryImport(preview, characterId, longTerm, core);
            const msg = `已新增 ${outcome.added} 条（长期 ${outcome.longTerm}、核心 ${outcome.core}），跳过重复 ${outcome.skipped} 条`;
            setResult(msg);
            setPreview(null);
            onImported();
            onNotice?.(msg);
        } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        finally { setBusy(false); }
    };
    const previewCount = preview ? (longTerm ? preview.longTermEntries.length : 0) + (core ? preview.coreEntries.length : 0) : 0;
    const duplicates = preview ? new Set(preview.existingIds) : null;
    const dupCount = preview && duplicates ? [
        ...(longTerm ? preview.longTermEntries : []),
        ...(core ? preview.coreEntries : []),
    ].filter(entry => duplicates.has(entry.id)).length : 0;

    return (
        <>
            <p className="menu-group-desc mx-2">角色记忆导入</p>
            <div className="menu-group">
                <div className="menu-item">
                    <span className="card-icon" style={{ "--icon-color": BINDING_ACCENTS.memory } as CSSProperties}>
                        <FileInput size={22} strokeWidth={1.75} />
                    </span>
                    <div className="menu-label-group">
                        <span className="menu-label">导入 {characterName} 的长期与核心记忆</span>
                        <span className="menu-desc">支持本工具导出的 ZIP / JSON；只新增，重复 ID 自动跳过，不覆盖原记忆</span>
                    </div>
                </div>
                <div className="px-4 pb-4 flex flex-col gap-2">
                    <input ref={inputRef} type="file" accept=".zip,.json,application/json,application/zip" className="hidden"
                        onChange={event => {
                            const file = event.currentTarget.files?.[0];
                            void choose(file);
                            event.currentTarget.value = "";
                        }} />
                    <button type="button" className="ui-btn ui-btn-outline p-2.5 w-full" disabled={busy}
                        onClick={() => inputRef.current?.click()}>
                        <FileInput size={14} className="mr-1.5" />{busy ? "正在处理..." : "选择记忆文件并预览"}
                    </button>
                    {preview && (
                        <div className="flex flex-col gap-2">
                            <p className="menu-desc">当前角色已有长期 {preview.currentCounts.longTerm} 条、核心 {preview.currentCounts.core} 条（含已失效历史）。</p>
                            <p className="menu-desc">{preview.filename}。文件中长期 {preview.longTermEntries.length} 条，核心 {preview.coreEntries.length} 条。</p>
                            <label className="menu-desc flex items-center gap-2">
                                <input type="checkbox" checked={longTerm} onChange={e => setLongTerm(e.target.checked)} />导入长期记忆
                            </label>
                            <label className="menu-desc flex items-center gap-2">
                                <input type="checkbox" checked={core} onChange={e => setCore(e.target.checked)} />导入核心记忆
                            </label>
                            <p className="menu-desc">选择 {previewCount} 条，其中已有相同 ID {dupCount} 条，预计新增 {previewCount - dupCount} 条。</p>
                            <p className="menu-desc">仅接受相同角色 ID。历史 provenance 仍按 Float 当前规则判断有效性。</p>
                            <button type="button" className="ui-btn ui-btn-primary p-2.5 w-full"
                                disabled={busy || previewCount === 0} onClick={() => void execute()}>
                                <Upload size={14} className="mr-1.5" />确认合并导入
                            </button>
                            <button type="button" className="ui-btn ui-btn-outline p-2 w-full" disabled={busy} onClick={() => setPreview(null)}>
                                <X size={13} className="mr-1.5" />取消
                            </button>
                        </div>
                    )}
                    {error && <p role="alert" className="menu-desc" style={{ color: "#cc4141" }}>{error}</p>}
                    {result && <p role="status" className="menu-desc">{result}</p>}
                </div>
            </div>
        </>
    );
}
