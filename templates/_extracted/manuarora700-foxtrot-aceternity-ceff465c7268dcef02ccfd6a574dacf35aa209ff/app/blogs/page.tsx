import Link from "next/link";
import { Container } from "@components/Container";
import { getAllFilesFrontMatter } from "lib/mdx";
import { GridPattern } from "@components/GridPattern";
import { BlurImage } from "@components/BlurImage";

export const dynamic = "force-static";

export default async function BlogsPage() {
  const blogs = await getAllFilesFrontMatter("blogs");
  const sortedBlogs = blogs.sort(
    (a: any, b: any) =>
      new Date(b?.publishedAt)?.getTime() - new Date(a?.publishedAt)?.getTime()
  );

  const pattern = {
    y: -6,
    squares: [
      [-1, 2],
      [1, 3],
      ...Array.from({ length: 10 }, () => [
        Math.floor(Math.random() * 20) - 10,
        Math.floor(Math.random() * 20) - 10,
      ]),
    ],
  };

  return (
    <Container
      title="Blogs | Foxtrot"
      className="pb-20 relative"
      description="Latest articles on web development and how a website can help you 10x your revenue."
    >
      <div className="absolute inset-0 rounded-2xl transition duration-300 [mask-image:linear-gradient(white,transparent)] group-hover:opacity-50">
        <GridPattern
          width={120}
          height={120}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%]  w-full skew-y-[-5deg] fill-tertiary/[0.05] stroke-gray-100  dark:fill-primary dark:stroke-gray-100"
          {...pattern}
        />
      </div>
      <div className="pb-4 pt-4 md:pb-20 md:pt-10 relative px-4">
        <div className="mx-auto max-w-2xl sm:text-center pb-10 ">
          <h2 className="text-3xl font-medium tracking-tight text-gray-900">
            Knowledge center at Foxtrot
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            Latest articles on web development and how a website can help you
            10x your revenue.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto mb-20">
        {sortedBlogs.map((blog: any) => (
          <BlogCard
            key={`blog-${blog.slug}`}
            link={"/blogs/" + blog.slug}
            title={blog.title}
            description={blog.description}
            image={blog.image}
            author={blog.author}
            authorAvatar={blog.authorAvatar}
            publishedAt={blog.publishedAt}
          />
        ))}
      </div>
    </Container>
  );
}

function BlogCard({ title, description, image, link }: any) {
  const truncate = (text: string) =>
    text.length > 100 ? text.substring(0, 200) + "..." : text;
  return (
    <Link
      href={link}
      className="relative  rounded-2xl p-4 transition duration-200"
    >
      <div className="flex flex-col cursor-pointer">
        <div className="w-full aspect-w-16 aspect-h-10 bg-gray-100 rounded-lg overflow-hidden xl:aspect-w-16 xl:aspect-h-10 relative h-40 sm:h-72 md:h-64 ">
          <BlurImage
            src={image}
            alt="thumbnail"
            fill
            className="object-cover h-full w-full"
          />
        </div>
        <div className="flex space-x-2  my-2 items-center"></div>
        <h2 className="font-bold my-4 text-2xl text-zinc-700">{title}</h2>
        <h4 className="text-base text-zinc-600">{truncate(description)}</h4>
      </div>
    </Link>
  );
}
