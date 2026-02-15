import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Define the content directory
const postsDirectory = path.join(process.cwd(), "src/content/blog");

export interface BlogPost {
    slug: string;
    title: string;
    date: string;
    description: string;
    image?: string;
    content: string;
}

export function getBlogPosts(): BlogPost[] {
    // Create directory if it doesn't exist to prevent errors
    if (!fs.existsSync(postsDirectory)) {
        return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);

    const allPostsData = fileNames
        .filter((fileName) => fileName.endsWith(".md"))
        .map((fileName) => {
            // Remove ".md" from file name to get id
            const slug = fileName.replace(/\.md$/, "");

            // Read markdown file as string
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, "utf8");

            // Use gray-matter to parse the post metadata section
            const { data, content } = matter(fileContents);

            // Combine the data with the id
            return {
                slug,
                content,
                title: data.title || "Untitled",
                date: data.date
                    ? new Date(data.date).toISOString()
                    : new Date().toISOString(),
                description: data.description || "",
                image: data.image,
                ...data,
            } as BlogPost;
        });

    // Sort posts by date
    return allPostsData.sort((a, b) => {
        if (a.date < b.date) {
            return 1;
        } else {
            return -1;
        }
    });
}

export function getBlogPost(slug: string): BlogPost | null {
    try {
        const fullPath = path.join(postsDirectory, `${slug}.md`);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        return {
            slug,
            content,
            title: data.title || "Untitled",
            date: data.date
                ? new Date(data.date).toISOString()
                : new Date().toISOString(),
            description: data.description || "",
            image: data.image,
            ...data,
        } as BlogPost;
    } catch (error) {
        return null;
    }
}
