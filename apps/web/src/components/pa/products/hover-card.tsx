"use client";

import Image from "next/image";
import { motion } from "motion/react";

export interface CardItem {
  logo: string;
  name: string;
  description: string;
  badge?: string;
  image: string;
  feature: string[];
}

// const HoverCard = ({ item }: { item: CardItem }) => {
//   return (
//     <div className="relative flex h-full min-h-110 flex-col justify-end overflow-hidden rounded-3xl p-6.5">
//       <Image
//         src={`${item.image}`}
//         alt={item.name}
//         fill
//         className="absolute inset-0 h-full w-full object-cover"
//       />
//       {item.badge && (
//         <div className="bg-natural-black text-natural-white -tracking-sm absolute top-6 left-6 z-10 rounded-full px-3 py-2 text-sm leading-3.5 font-medium">
//           {item.badge}
//         </div>
//       )}
//       <div className="shadow-card-md z-10 flex w-full flex-col gap-6 rounded-2xl bg-white px-6 py-4">
//         <div className="flex flex-col gap-2.5">
//           <div className="flex items-center gap-2.5">
//             <Image
//               src={`${item.logo}`}
//               alt={item.name}
//               height={32}
//               width={32}
//               className="size-8"
//             />
//             <div className="text-natural-black text-lg leading-8 font-semibold">
//               {item.name}
//             </div>
//           </div>
//           <div className="text-muted-foreground text-base leading-6 font-medium">
//             {item.description}
//           </div>
//         </div>
//         <div className="flex flex-col gap-4.5 pb-3">
//           {item.feature.map((feature, index) => (
//             <div
//               key={`${feature}-${index}`}
//               className="text-muted-foreground flex items-center gap-2 text-sm leading-3.5 font-medium"
//             >
//               <div className="bg-muted-foreground/50 size-2.5 rounded-full" />
//               {feature}
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };


export const HoverCard = ({ item }: { item: CardItem }) => {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      className="relative flex h-full min-h-110 flex-col justify-end overflow-hidden rounded-3xl p-6.5"
    >
      <Image
        src={`${item.image}`}
        alt={item.name}
        fill
        className="absolute inset-0 h-full w-full object-cover"
      />

      {item.badge && (
        <div className="bg-natural-black text-natural-white absolute top-6 left-6 z-10 rounded-full px-3 py-2 text-sm font-medium">
          {item.badge}
        </div>
      )}

      <motion.div
        layout
        className="shadow-card-md z-10 flex w-full flex-col rounded-2xl bg-white px-6 py-4"
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <Image
              src={`${item.logo}`}
              alt={item.name}
              height={32}
              width={32}
              className="size-8"
            />
            <div className="text-natural-black text-lg font-semibold">
              {item.name}
            </div>
          </div>

          <div className="text-muted-foreground text-base font-medium">
            {item.description}
          </div>
        </div>

        {/* Animated features */}
        <motion.div
          variants={{
            rest: { height: 0, opacity: 0 },
            hover: {
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: 0.15 },
                opacity: { duration: 0.1, delay: 0.1 },
              },
            },
          }}
          initial={false}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-4.5 pb-3 mt-6">
            {item.feature.map((feature, index) => (
              <motion.div
                key={`${feature}-${index}`}
                variants={{
                  rest: { opacity: 0, y: 10 },
                  hover: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="text-muted-foreground flex items-center gap-2 text-sm font-medium"
              >
                <div className="bg-muted-foreground/50 size-2.5 rounded-full" />
                {feature}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

