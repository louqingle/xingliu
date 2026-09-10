import type { Metadata } from "next";
import UserClient from "./UserClient";

export const metadata: Metadata = {
  title: "个人主页 | 星流",
  description: "查看星流用户主页、作品与社交信息。",
};

export default async function UserPage({searchParams}:{searchParams:Promise<{username?:string|string[]|undefined}>}){
  const params=await searchParams;
  const raw=params?.username;
  const username=Array.isArray(raw)?raw[0]||"":raw||"";
  return <UserClient username={username}/>;
}
