import { getPosts } from "@/actions/post.action";
import { getDbUserId } from "@/actions/user.action";
import CreatePost from "@/components/CreatePost";
import ModeToggle from "@/components/ModeToggle";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import WhoToFollow from "@/components/WhoToFollow";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";

async function Home() {
  const user = await currentUser();
  const posts = await getPosts();
  const dbUserId = await getDbUserId();


  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <div className="lg:col-span-6">
        {user ? <CreatePost /> : null}
        <div
          className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} dbUserId={dbUserId as string} />
          ))}
        </div>
      </div>
      <div className="hidden lg:block lg:col-span-4  sticky top-20"><WhoToFollow /></div>
    </div>
  );
}

export default Home;