import { Container } from "@components/Container";
import { BlurImage } from "@components/BlurImage";
import moment from "moment";
import { getFileBySlug, getFiles } from "lib/mdx";
import { RenderMDX } from "@components/RenderMDX";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const snippets = await getFiles("blogs");
  return snippets.map((s: string) => ({ slug: s.replace(/\.mdx/, "") }));
}

type BlogFrontMatter = {
  title?: string;
  description?: string;
  author?: string;
  authorAvatar?: string;
  image?: string;
  publishedAt?: string;
  [key: string]: any;
};

export default async function BlogPage({
  params,
}: {
  params: { slug: string };
}) {
  const { mdxSource, frontMatter } = await getFileBySlug("blogs", params.slug);
  const fm = frontMatter as BlogFrontMatter;

  return (
    <Container
      title={`${fm.title ?? "Blog"} | Foxtrot`}
      description={fm.description}
      className="max-w-7xl mx-auto pb-20 px-4 md:px-16"
    >
      <div className="max-w-5xl mx-auto">
        <Header frontMatter={fm} />
      </div>
      <div className="prose prose-sm lg:prose-lg mx-auto max-w-3xl pb-10">
        <RenderMDX mdxSource={mdxSource} />
      </div>
    </Container>
  );
}

function Header({ frontMatter }: any) {
  return (
    <div className="my-10">
      <div className="w-full h-52 md:h-96 rounded-lg relative flex justify-center mb-4 overflow-hidden">
        <BlurImage
          src={frontMatter.image}
          alt="thumbnail"
          className="rounded-lg object-cover"
          layout="fill"
        />
      </div>
      <div className="flex space-x-2  my-2 items-center justify-between max-w-7xl mb-20 ">
        <div className="flex flex-row justify-between space-x-2 w-full">
          <div className="flex flex-row space-x-2 items-center">
            <div className="border-2 border-gray-100  rounded-full flex items-center">
              <BlurImage
                src={frontMatter.authorAvatar}
                width="20"
                height="20"
                className="rounded-full object-cover "
              />
            </div>
            <span className="text-zinc-700 font-semibold">
              {" "}
              {frontMatter.author}
            </span>
          </div>

          <span className="text-zinc-400 text-base">
            {moment(frontMatter.publishedAt).format("Do MMM YYYY")}
          </span>
        </div>
      </div>
      <h1 className="text-3xl sm:text-4xl md:6xl text-zinc-700 font-extrabold  mx-auto mt-10 mb-10 md:mb-20 text-center">
        {frontMatter.title}
      </h1>
    </div>
  );
}
