"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";


export async function syncUser() {

    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) return;

        // Check the existing user in db
        const existingUser = await prisma.user.findUnique({
            where: {
                clerkId: userId
            }
        });

        if (existingUser) return existingUser;

        const dbUser = await prisma.user.create({
            data: {
                clerkId: userId,
                name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                username: user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
                email: user.emailAddresses[0].emailAddress,
                image: user.imageUrl
            }
        })

        return dbUser;
    } catch (error) {
        console.log(`Error syncing user: ${error}`);

    }

}


// create a another function
export async function getUserByClerkId(clerkId: string) {

    return await prisma.user.findUnique({
        where: {
            clerkId,
        },
        include: {
            _count: {
                select: {
                    followers: true,
                    following: true,
                    posts: true,
                },
            },
        },
    })

}

// create a another function
export async function getDbUserId() {
    const { userId: clerkId } = await auth();

    if (!clerkId) return null;

    const user = await getUserByClerkId(clerkId);

    if (!user) return new Error("User not found");
    return user.id;
}

// create a another function to fetch the user
export async function getRandomUsers() {
    try {
        const userId = await getDbUserId();

        if (!userId) return [];

        // get 3 users exclude ourselves and users we are follow
        const randomUsers = await prisma.user.findMany({
            where: {
                AND: [
                    { NOT: { id: userId as string } },
                    {
                        NOT: {
                            followers: {
                                some: {
                                    followerId: userId as string
                                }
                            }
                        }
                    },
                ]
            },
            select: {
                id: true,
                name: true,
                username: true,
                image: true,
                _count: {
                    select: {
                        followers: true,
                    }
                }
            },
            take: 3
        });

        return randomUsers;
    } catch (error) {
        console.log(`Error getting random users: ${error}`);
        return [];
    }
}

export async function toggleFollow(targetUserId: string) {
    try {
        const userId = await getDbUserId();

        if (!userId) return;

        if (userId === targetUserId) {
            throw new Error("You cannot follow yourself");
        }

        const existingFollow = await prisma.follows.findUnique({
            where: {
                followerId_followingId: {
                    followerId: userId as string,
                    followingId: targetUserId
                }
            }
        });

        if (existingFollow) {
            await prisma.follows.delete({
                where: {
                    followerId_followingId: {
                        followerId: userId as string,
                        followingId: targetUserId
                    }
                }
            });
        } else {
            await prisma.$transaction([
                prisma.follows.create({
                    data: {
                        followerId: userId as string,
                        followingId: targetUserId
                    }
                }),

                prisma.notification.create({
                    data: {
                        type: "FOLLOW",
                        userId: targetUserId, // user being followed
                        creatorId: userId as string //  user following
                    }
                })
            ])
        }
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.log(`Error following user: ${error}`);
        return { success: false, error: "Error following user" };
    }

}