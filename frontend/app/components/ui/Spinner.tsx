import { Navbar } from "../layout";

type Props = {
  navbar: boolean;
};

const Spinner = ({ navbar = true }: Props) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {navbar && <Navbar showAuth={false} />}
      <div className="flex justify-center mt-12">
        <div className="w-14 h-14 border-4 border-aws-orange border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
};

export default Spinner;
