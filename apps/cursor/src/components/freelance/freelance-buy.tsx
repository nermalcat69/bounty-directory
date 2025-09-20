import { Button } from "@/components/ui/button";
import Link from "next/link";

export function FreelanceBuy() {
  return (
    <div className="relative min-h-[250px] md:min-h-[340px] md:max-w-[350px] flex bg-black p-4 sm:p-6">
      <div
        className="absolute inset-0 border border-border"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -60deg,
            transparent,
            transparent 1px,
            #2C2C2C 1px,
            #2C2C2C 2px,
            transparent 2px,
            transparent 6px
          )`,
        }}
      />

      <div className="relative z-10 text-white">
        <h1 className="text-3xl sm:text-4xl tracking-tight">
          Find skilled <br />
          freelancers for <br />
          just $19.
        </h1>

        <p className="text-sm text-[#878787] mt-4">
          Post your freelance project and connect
          <br /> with talented developers ready to bring
          <br /> your ideas to life.
        </p>

        <Link href="/freelance/new">
          <Button
            className="font-mono mt-12 text-sm h-9 rounded-full border-white bg-transparent hover:bg-white hover:text-black transition-colors"
            variant="outline"
          >
            Post freelance work
          </Button>
        </Link>
      </div>
    </div>
  );
}