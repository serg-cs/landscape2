import { createIntersectionObserver } from '@solid-primitives/intersection-observer';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, onCleanup, Show } from 'solid-js';

import { BaseItem, Item } from '../../../types';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import Image from '../../common/Image';
import { Loading } from '../../common/Loading';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import { useFullDataReady } from '../../stores/fullData';
import Card from '../card/Card';
import styles from './GridItem.module.css';

interface Props {
  item: BaseItem | Item;
  borderColor?: string;
  showMoreInfo: boolean;
  activeDropdown: boolean;
}

const DEFAULT_DROPDOWN_WIDTH = 450;
const DEFAULT_MARGIN = 30;

const GridItem = (props: Props) => {
  let ref;
  const fullDataReady = useFullDataReady();
  const [btn, setBtn] = createSignal<HTMLButtonElement[]>([]);
  const [wrapper, setWrapper] = createSignal<HTMLDivElement>();
  const updateActiveItemId = useUpdateActiveItemId();
  const [visibleDropdown, setVisibleDropdown] = createSignal(false);
  const [onLinkHover, setOnLinkHover] = createSignal(false);
  const [onDropdownHover, setOnDropdownHover] = createSignal(false);
  const [tooltipAlignment, setTooltipAlignment] = createSignal<'right' | 'left' | 'center'>('center');
  const [dropdownTimeout, setDropdownTimeout] = createSignal<number>();
  const [elWidth, setElWidth] = createSignal<number>(0);
  const [item, setItem] = createSignal<Item | undefined>();
  const [loaded, setLoaded] = createSignal<boolean>(false);

  createEffect(
    on(fullDataReady, () => {
      if (fullDataReady()) {
        setItem(itemsDataGetter.findById(props.item.id));
      }
    })
  );

  const calculateTooltipPosition = () => {
    if (!isUndefined(wrapper())) {
      const windowWidth = window.innerWidth;
      const bounding = wrapper()!.getBoundingClientRect();
      setElWidth(bounding.width);
      const overflowTooltip = (DEFAULT_DROPDOWN_WIDTH - elWidth()) / 2;
      if (
        DEFAULT_MARGIN + bounding.right + overflowTooltip < windowWidth &&
        bounding.left - overflowTooltip - DEFAULT_MARGIN > 0
      ) {
        setTooltipAlignment('center');
      } else if (windowWidth - bounding.right - DEFAULT_MARGIN < DEFAULT_DROPDOWN_WIDTH - bounding.width) {
        setTooltipAlignment('right');
      } else {
        setTooltipAlignment('left');
      }
    }
  };

  createEffect(() => {
    if (props.activeDropdown) {
      if (!visibleDropdown() && (onLinkHover() || onDropdownHover())) {
        setDropdownTimeout(
          setTimeout(() => {
            if (onLinkHover() || onDropdownHover()) {
              calculateTooltipPosition();
              setVisibleDropdown(true);
            }
          }, 200)
        );
      }
      if (visibleDropdown() && !onLinkHover() && !onDropdownHover()) {
        setDropdownTimeout(
          setTimeout(() => {
            if (!onLinkHover() && !onDropdownHover()) {
              // Delay to hide the dropdown to avoid hide it if user changes from link to dropdown
              setVisibleDropdown(false);
            }
          }, 50)
        );
      }
    }
  });

  onCleanup(() => {
    if (!isUndefined(dropdownTimeout())) {
      clearTimeout(dropdownTimeout());
    }
  });

  createIntersectionObserver(btn, (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !loaded()) {
        setLoaded(true);
      }
    });
  });

  return (
    <Show
      when={props.activeDropdown}
      fallback={
        <div
          style={props.item.featured && props.item.featured.label ? { border: `2px solid ${props.borderColor}` } : {}}
          class={`card rounded-0 position-relative p-0 ${styles.card}`}
          classList={{
            bigCard: !isUndefined(props.item.featured),
            withLabel: !isUndefined(props.item.featured) && !isUndefined(props.item.featured.label),
            whithoutRepo: isUndefined(props.item.oss) || !props.item.oss,
          }}
        >
          <div class="w-100 h-100">
            <div
              class={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
              classList={{ noCursor: !props.activeDropdown }}
            >
              <Image name={props.item.name} class={`m-auto ${styles.logo}`} logo={props.item.logo} />

              {props.item.featured && props.item.featured.label && (
                <div
                  class={`text-center text-uppercase text-dark position-absolute start-0 end-0 bottom-0 ${styles.legend}`}
                  style={props.item.featured ? { 'border-top': `2px solid ${props.borderColor}` } : {}}
                >
                  {props.item.featured.label}
                </div>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div
        style={props.item.featured && props.item.featured.label ? { border: `2px solid ${props.borderColor}` } : {}}
        class={`card rounded-0 position-relative p-0 ${styles.card}`}
        classList={{
          bigCard: !isUndefined(props.item.featured),
          withLabel: !isUndefined(props.item.featured) && !isUndefined(props.item.featured.label),
          whithoutRepo: isUndefined(props.item.oss) || !props.item.oss,
        }}
      >
        <div class="position-absolute">
          <Show when={visibleDropdown()}>
            <div
              ref={ref}
              role="complementary"
              class={`dropdown-menu rounded-0 p-3 popover show ${styles.dropdown} ${
                styles[`${tooltipAlignment()}Aligned`]
              }`}
              style={{
                'min-width': `${DEFAULT_DROPDOWN_WIDTH}px`,
                left: tooltipAlignment() === 'center' ? `${-(DEFAULT_DROPDOWN_WIDTH - elWidth()) / 2}px` : 'auto',
              }}
              onMouseEnter={() => {
                setOnDropdownHover(true);
              }}
              onMouseLeave={() => {
                setOnDropdownHover(false);
              }}
            >
              <div class={`d-block position-absolute ${styles.arrow}`} />
              <Show when={!isUndefined(item())} fallback={<Loading />}>
                <Card item={item()!} />
              </Show>
            </div>
          </Show>
        </div>

        <div ref={setWrapper} class="w-100 h-100">
          <button
            ref={(el) => setBtn([el])}
            class={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
            onClick={(e) => {
              e.preventDefault();
              if (props.showMoreInfo) {
                updateActiveItemId(props.item.id);
                setOnLinkHover(false);
                setVisibleDropdown(false);
              }
            }}
            onMouseEnter={(e) => {
              e.preventDefault();
              setOnLinkHover(true);
            }}
            onMouseLeave={() => {
              setOnLinkHover(false);
            }}
            aria-label={`${props.item.name} info`}
            aria-expanded={visibleDropdown()}
            aria-hidden="true"
            tabIndex={-1}
          >
            <Image name={props.item.name} class={`m-auto ${styles.logo}`} logo={props.item.logo} isLoaded={loaded()} />

            {props.item.featured && props.item.featured.label && (
              <div
                class={`text-center text-uppercase text-dark position-absolute start-0 end-0 bottom-0 ${styles.legend}`}
                style={props.item.featured ? { 'border-top': `2px solid ${props.borderColor}` } : {}}
              >
                {props.item.featured.label}
              </div>
            )}
          </button>
        </div>
      </div>
    </Show>
  );
};

export default GridItem;
