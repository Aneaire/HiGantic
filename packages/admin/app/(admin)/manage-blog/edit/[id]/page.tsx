"use client";

import { useParams } from "next/navigation";
import BlogEditor from "../../_components/BlogEditor";

export default function EditPostPage() {
  const params = useParams();
  return <BlogEditor postId={params.id as string} />;
}
