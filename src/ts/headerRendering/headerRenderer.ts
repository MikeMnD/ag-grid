import {GridOptionsWrapper} from "../gridOptionsWrapper";
import {ColumnController} from "../columnController/columnController";
import {GridPanel} from "../gridPanel/gridPanel";
import {Column} from "../entities/column";
import {Bean, Autowired, Context, PostConstruct, PreDestroy} from "../context/context";
import {HeaderContainer} from "./headerContainer";
import {EventService} from "../eventService";
import {Events} from "../events";

@Bean('headerRenderer')
export class HeaderRenderer {

    @Autowired('gridOptionsWrapper') private gridOptionsWrapper: GridOptionsWrapper;
    @Autowired('columnController') private columnController: ColumnController;
    @Autowired('gridPanel') private gridPanel: GridPanel;
    @Autowired('context') private context: Context;
    @Autowired('eventService') private eventService: EventService;

    private pinnedLeftContainer: HeaderContainer;
    private pinnedRightContainer: HeaderContainer;
    private centerContainer: HeaderContainer;

    private eHeaderViewport: HTMLElement;
    private eRoot: HTMLElement;
    private eHeaderOverlay: HTMLElement;

    @PostConstruct
    private init() {
        this.eHeaderViewport = this.gridPanel.getHeaderViewport();
        this.eRoot = this.gridPanel.getRoot();
        this.eHeaderOverlay = this.gridPanel.getHeaderOverlay();

        this.pinnedLeftContainer = new HeaderContainer(this.gridPanel.getPinnedLeftHeader(), null, this.eRoot, Column.PINNED_LEFT);
        this.pinnedRightContainer = new HeaderContainer(this.gridPanel.getPinnedRightHeader(), null, this.eRoot, Column.PINNED_RIGHT);
        this.centerContainer = new HeaderContainer(this.gridPanel.getHeaderContainer(), this.gridPanel.getHeaderViewport(), this.eRoot, null);

        this.context.wireBean(this.pinnedLeftContainer);
        this.context.wireBean(this.pinnedRightContainer);
        this.context.wireBean(this.centerContainer);

        // when grid columns change, it means the number of rows in the header has changed and it's all new columns
        this.eventService.addEventListener(Events.EVENT_GRID_COLUMNS_CHANGED, this.onGridColumnsChanged.bind(this));

        // shotgun way to get labels to change, eg from sum(amount) to avg(amount)
        this.eventService.addEventListener(Events.EVENT_COLUMN_VALUE_CHANGED, this.refreshHeader.bind(this));

        // for resized, the individual cells take care of this, so don't need to refresh everything
        this.eventService.addEventListener(Events.EVENT_COLUMN_RESIZED, this.setPinnedColContainerWidth.bind(this));
        this.eventService.addEventListener(Events.EVENT_DISPLAYED_COLUMNS_CHANGED, this.setPinnedColContainerWidth.bind(this));

        if (this.columnController.isReady()) {
            this.refreshHeader();
        }
    }

    @PreDestroy
    private destroy(): void {
        this.pinnedLeftContainer.destroy();
        this.pinnedRightContainer.destroy();
        this.centerContainer.destroy();
    }

    private onGridColumnsChanged(): void {
        this.setHeight();
    }

    // this is called from the API and refreshes everything, should be broken out
    // into refresh everything vs just something changed
    public refreshHeader() {

        this.setHeight();

        this.pinnedLeftContainer.refresh();
        this.pinnedRightContainer.refresh();
        this.centerContainer.refresh();

        this.setPinnedColContainerWidth();
    }

    private setHeight(): void {
        // if forPrint, overlay is missing
        if (this.eHeaderOverlay) {
            var rowHeight = this.gridOptionsWrapper.getHeaderHeight();
            // we can probably get rid of this when we no longer need the overlay
            var dept = this.columnController.getHeaderRowCount();
            this.eHeaderOverlay.style.height = rowHeight + 'px';
            this.eHeaderOverlay.style.top = ((dept-1) * rowHeight) + 'px';
        }
    }
    
    public setPinnedColContainerWidth() {
        if (this.gridOptionsWrapper.isForPrint()) {
            // pinned col doesn't exist when doing forPrint
            return;
        }

        var pinnedLeftWidth = this.columnController.getPinnedLeftContainerWidth();
        this.eHeaderViewport.style.marginLeft = pinnedLeftWidth + 'px';
        this.pinnedLeftContainer.setWidth(pinnedLeftWidth);

        var pinnedRightWidth = this.columnController.getPinnedRightContainerWidth();
        this.eHeaderViewport.style.marginRight = pinnedRightWidth + 'px';
        this.pinnedRightContainer.setWidth(pinnedRightWidth);
    }

}
