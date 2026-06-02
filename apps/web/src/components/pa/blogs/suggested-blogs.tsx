import { Container } from "@/components/pa/container";
import { BlogCard } from "@/components/pa/resources/blog-card";
import { blog } from "@/lib/pa/source";

export const SuggestedBlogs = () => {
  const posts = [...blog.getPages()]
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .slice(0, 3);

  return (
    <section className="w-full">
      <Container className="grid grid-cols-1 gap-6 py-30 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard
            key={post.url}
            card={{
              title: post.data.title,
              description: post.data.description || "",
              time: post.data.timeToRead,
              image: post.data.previewImage,
              href: post.url,
            }}
          />
        ))}
      </Container>
    </section>
  );
};

