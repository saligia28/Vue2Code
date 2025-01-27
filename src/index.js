import { initMixin } from "./init"
import { initLifeCycle } from "./liftCycle"

function Vue(options){
    // options就是用户的选项

    this._init(options)
}
initMixin(Vue)
initLifeCycle(Vue)

export default Vue