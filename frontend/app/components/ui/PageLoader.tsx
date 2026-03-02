import { Navbar } from "../layout";
import Spinner from "./Spinner";

type Props = {
  showNavbar?: boolean;
};

const PageLoader = ({ showNavbar = true }: Props) => {
  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar showAuth={false} />}
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    </div>
  );
};

export default PageLoader;
