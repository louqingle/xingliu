"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Msg={id:string;sender_id:string;content:string;created_at:string};
export default function ChatPage({params}:{params:{id:string}}){
 const [messages,setMessages]=useState<Msg[]>([]);const [text,setText]=useState("");const [me,setMe]=useState("");const [name,setName]=useState("聊天");const [sending,setSending]=useState(false);const endRef=useRef<HTMLDivElement>(null);
 const conversationId=params.id;
 useEffect(()=>{(async()=>{if(!supabase){return}const {data:{session}}=await supabase.auth.getSession();if(!session){location.href="/auth";return}setMe(session.user.id);const {data:member}=await supabase.from("conversation_members").select("user_id").eq("conversation_id",conversationId).neq("user_id",session.user.id).maybeSingle();if(member?.user_id){const {data:p}=await supabase.from("profiles").select("display_name,username").eq("id",member.user_id).maybeSingle();setName(p?.display_name||p?.username||"聊天")}await load(session.user.id);await supabase.from("conversation_members").update({last_read_at:new Date().toISOString()}).eq("conversation_id",conversationId).eq("user_id",session.user.id);})();},[conversationId]);
 async function load(userId:string){if(!supabase)return;const {data}=await supabase.from("messages").select("id,sender_id,content,created_at").eq("conversation_id",conversationId).order("created_at",{ascending:true});setMessages(data||[]);setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),50)}
 async function send(e:any){e.preventDefault();const value=text.trim();if(!value||sending||!supabase)return;setSending(true);const {error}=await supabase.rpc("send_xingliu_message",{p_conversation_id:conversationId,p_content:value});if(!error){setText("");await load(me)}else alert(error.message);setSending(false)}
 return <main className="chatPage"><header className="chatHeader"><button onClick={()=>location.href="/messages"}><ArrowLeft/></button><div><b>{name}</b><small>星流私信</small></div><span/></header><div className="chatMessages">{messages.map(m=><div key={m.id} className={m.sender_id===me?"bubbleRow mine":"bubbleRow"}><div className="bubble">{m.content}</div></div>)}<div ref={endRef}/></div><form className="chatComposer" onSubmit={send}><input value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="发消息…"/><button disabled={sending||!text.trim()}><Send size={20}/></button></form></main>
}
