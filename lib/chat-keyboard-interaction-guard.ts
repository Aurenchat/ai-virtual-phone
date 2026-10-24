/**
 * Ephemeral, per-mounted-chat keyboard auto-reply pause state.
 *
 * A blocked timer is RESTARTED at the configured full delay when the last
 * protected surface/gesture closes. It is never fired while protected UI is
 * open, and focusing/typing in the real composer discards the old countdown.
 *
 * Does not know about, stop, or cancel any already-running AI generation.
 */
export class ChatKeyboardInteractionGuard {
    private surfaceOpen = false;
    private gestures = new Set<number>();
    private restartDue = false;

    /** Is an active menu, editor, or interaction gesture preventing auto-reply? */
    get blocked(): boolean {
        return this.surfaceOpen || this.gestures.size > 0;
    }

    /** Pause an already scheduled reply when an interaction begins. */
    beginGesture(hadTimer: boolean, pointer = 0): void {
        this.gestures.add(pointer);
        if (hadTimer) this.restartDue = true;
    }

    /** End one in-progress pointer/touch/long-press gesture. */
    endGesture(pointer = 0): boolean {
        this.gestures.delete(pointer);
        return this.canRestart();
    }

    /** State-driven protection, e.g. message menu or rich-media modal. */
    setSurfaceOpen(open: boolean, hadTimer: boolean): boolean {
        if (open) {
            if (hadTimer) this.restartDue = true;
            this.surfaceOpen = true;
            return false;
        }
        this.surfaceOpen = false;
        return this.canRestart();
    }

    /** Keyboard hid during a protected interaction: defer its auto-reply intent. */
    keyboardDismissed(): boolean {
        if (!this.blocked) {
            this.restartDue = false; // a new real dismiss supersedes any previous deferred intent
            return true;
        }
        this.restartDue = true;
        return false;
    }

    /** Keep Float's existing 'emoji/sticker/plus panel closed => countdown' rule. */
    legacyPanelClosed(): void {
        this.restartDue = true;
    }

    /** Reopening the actual chat keyboard or typing cancels the old countdown. */
    composerResumed(): void {
        this.restartDue = false;
    }

    /** Does the guard have an eligible delayed reply to restart? */
    private canRestart(): boolean {
        return !this.blocked && this.restartDue;
    }

    /** Take a single restart permit. No permit can escape an open UI/gesture. */
    takeRestart(): boolean {
        if (!this.canRestart()) return false;
        this.restartDue = false;
        return true;
    }

    reset(): void {
        this.surfaceOpen = false;
        this.gestures.clear();
        this.restartDue = false;
    }
}
