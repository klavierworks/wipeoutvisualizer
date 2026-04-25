type LoadingProps = {
  loaded: number
  total: number
}

const Loading = ({ loaded, total }: LoadingProps) => (
  <div className="loading">
    Loading tracks… {loaded}/{total}
  </div>
)

export default Loading
