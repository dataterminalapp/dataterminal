import NavBar from "../../layout/navbar";
import PreferedLayout from "./layout";
import Limit from "./limit";

const Preferences = () => {
  return (
    <div className="flex flex-col h-full max-h-full overflow-scroll">
      <NavBar tabType={"Preferences"} items={[]} />

      <div className="flex-1 flex flex-col w-full px-6 md:px-10 lg:px-16 xl:px-20 2xl:px-24 max-w-[1250px] mx-auto">
        {/* <Header resultId={resultId} isConnectionDeleted={isConnectionDeleted} /> */}
        <h1 className="text-2xl font-semibold mt-4">Preferences</h1>
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div>
            <h2 className=" cols-span-1 text-2xl text-muted-foreground font-semibold">
              Layout
            </h2>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Choose your preferred layout for the application.
            </p>
          </div>
          <div className="col-span-3">
            <PreferedLayout />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          <div>
            <h2 className=" cols-span-1 text-2xl text-muted-foreground font-semibold">
              Query Limits
            </h2>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Set a limit for the number of rows returned by queries.
            </p>
          </div>
          <div className="col-span-3">
            <Limit className="mt-3" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
