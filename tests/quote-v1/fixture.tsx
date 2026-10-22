// Real ChatRoom and production modules, disposable localhost data only.
import '../../scripts/imessage-theme/fixture';
import * as quote from '../../lib/chat-quote';
import { chatDb } from '../../lib/chat-db';
import { parseAIResponse } from '../../lib/rich-message-parser';
import { formatRichMediaForHistory } from '../../lib/llm-prompt-assembler';
import { loadNativeTimeline, prepareShortTermContext, formatTimelineForSummarization } from '../../lib/short-term-assembler';
import { storeMediaBlob, deleteMediaRef } from '../../lib/media-cache-storage';
import { CHAT_SESSION_CSS_EXAMPLE } from '../../lib/css-examples';
const w = window as any;
w.quoteTest = { ...quote, chatDb, parseAIResponse, formatRichMediaForHistory, loadNativeTimeline, prepareShortTermContext, formatTimelineForSummarization, storeMediaBlob, deleteMediaRef, CHAT_SESSION_CSS_EXAMPLE,
    theme(css: string) {
        const sessions = w.imTest.chat.loadChatSessions();
        w.imTest.chat.saveChatSessions(sessions.map((s: any) => ({ ...s, customCSS: css })));
        w.imTest.remount();
    },
    flush: () => chatDb.messages.count(),
};
