"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { tiemposHeadline } from "@/app/fonts";
import { ArrowUp, Loader2 } from "lucide-react";

type ChatMessage = {
	id: string;
	role: "user" | "assistant";
	text: string;
	at: number;
};

const SUGGESTIONS: string[] = [
	"Summarize my latest prospects",
	"What should I reply to an interested tenant?",
	"Draft a listing description for a 2BR near MRT",
	"Schedule a viewing this Friday evening",
	"What are the top leads right now?",
];

export default function AssistantChatPage() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [idx, setIdx] = useState(0);
	const listEndRef = useRef<HTMLDivElement | null>(null);

	// Rotate placeholder like ChatGPT
	useEffect(() => {
		const t = setInterval(() => setIdx((i) => (i + 1) % SUGGESTIONS.length), 3500);
		return () => clearInterval(t);
	}, []);

	const placeholder = useMemo(() => SUGGESTIONS[idx], [idx]);

	useEffect(() => {
		listEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	const send = async (text: string) => {
		if (!text.trim() || sending) return;
		const clean = text.trim();
		setInput("");
		const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: clean, at: Date.now() };
		setMessages((m) => [...m, userMsg]);
		setSending(true);
		try {
			const res = await fetch("/api/agent", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message: clean,
					history: [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, text: m.text })),
				}),
			});
			const data = await res.json();
			const replyText = (data?.reply as string) || (res.ok ? "" : "Something went wrong. Please try again.");
			const assistantMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				text: replyText || "I'm sorry, I couldn't process that. Please try again.",
				at: Date.now(),
			};
			setMessages((m) => [...m, assistantMsg]);
		} catch {
			setMessages((m) => [
				...m,
				{ id: crypto.randomUUID(), role: "assistant", text: "Network error. Please try again.", at: Date.now() },
			]);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
				<div className="mx-auto w-full max-w-4xl px-4 py-3">
					<h1 className={`text-xl font-semibold ${tiemposHeadline.className}`}>Assistant</h1>
					<p className="text-xs text-muted-foreground">Ask anything about your rentals, prospects, or tasks.</p>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1">
				<div className="mx-auto w-full max-w-4xl px-4 pb-40 pt-6">
					{/* Empty state like ChatGPT */}
					{messages.length === 0 ? (
						<div className="pt-20 pb-10 text-center">
							<h2 className={`text-3xl md:text-4xl font-semibold tracking-tight ${tiemposHeadline.className}`}>
								Back at it
							</h2>
							<p className="mt-2 text-sm text-muted-foreground">
								How can I help you today?
							</p>
							<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
								{SUGGESTIONS.map((s) => (
									<button
										key={s}
										onClick={() => send(s)}
										className="text-left rounded-lg border bg-card hover:bg-accent/30 px-4 py-3 text-sm transition-colors"
									>
										{s}
									</button>
								))}
							</div>
						</div>
					) : null}

					{/* Message list */}
					{messages.length > 0 && (
						<div className="space-y-4">
							{messages.map((m) => (
								<div key={m.id} className="flex">
									<div
										className={
											m.role === "user"
												? "ml-auto max-w-[80%] rounded-lg bg-primary text-primary-foreground px-4 py-2"
												: "mr-auto max-w-[80%] rounded-lg border bg-card px-4 py-2"
										}
									>
										<div className="text-xs opacity-70 mb-1">
											{m.role === "user" ? "You" : "Assistant"} • {new Date(m.at).toLocaleTimeString()}
										</div>
										<div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
									</div>
								</div>
							))}
							<div ref={listEndRef} />
						</div>
					)}
				</div>
			</main>

			{/* Composer */}
			<div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/90 to-background/40 border-t">
				<div className="mx-auto w-full max-w-3xl px-4 py-4">
					<Card className="p-2 shadow-sm">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								void send(input);
							}}
							className="flex items-end gap-2"
						>
							<Input
								autoFocus
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder={placeholder}
								className="flex-1 h-12 text-[16px]"
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										void send(input);
									}
								}}
							/>
							<Button type="submit" disabled={sending || !input.trim()} className="h-10 w-10 p-0">
								{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
							</Button>
						</form>
					</Card>
					<div className="mt-2 text-center text-xs text-muted-foreground">
						Press Enter to send • Shift+Enter for new line
					</div>
				</div>
			</div>
		</div>
	);
}

