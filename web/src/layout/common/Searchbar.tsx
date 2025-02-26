import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, For, on, onCleanup, Show } from 'solid-js';

import { useOutsideClick } from '../../hooks/useOutsideClick';
import { BaseItem, SVGIconKind } from '../../types';
import { useUpdateActiveItemId } from '../stores/activeItem';
import FoundationBadge from './FoundationBadge';
import HoverableItem from './HoverableItem';
import MaturityBadge from './MaturityBadge';
import styles from './Searchbar.module.css';
import SVGIcon from './SVGIcon';

interface Props {
  items: BaseItem[];
}

const SEARCH_DELAY = 3 * 100; // 300ms
const MIN_CHARACTERS_SEARCH = 2;

const Searchbar = (props: Props) => {
  const updateActiveItemId = useUpdateActiveItemId();
  const [inputEl, setInputEl] = createSignal<HTMLInputElement>();
  const [dropdownRef, setDropdownRef] = createSignal<HTMLInputElement>();
  const [value, setValue] = createSignal<string>('');
  const [itemsList, setItemsList] = createSignal<BaseItem[] | null>(null);
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [highlightedItem, setHighlightedItem] = createSignal<number | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = createSignal<number | null>(null);

  useOutsideClick([dropdownRef], visibleDropdown, () => {
    setValue('');
    cleanItemsSearch();
  });

  const onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Escape':
        cleanItemsSearch();
        return;
      case 'ArrowDown':
        updateHighlightedItem('down');
        return;
      case 'ArrowUp':
        updateHighlightedItem('up');
        return;
      case 'Enter':
        e.preventDefault();
        if (!isNull(itemsList()) && !isNull(highlightedItem())) {
          if (highlightedItem() === itemsList()!.length) {
            search();
          } else {
            const selectedProject = itemsList()![highlightedItem()!];
            if (selectedProject) {
              openItemModal(selectedProject.id);
            }
          }
        } else {
          search();
        }
        return;
      default:
        return;
    }
  };

  const openItemModal = (itemId: string) => {
    updateActiveItemId(itemId);
    setValue('');
    cleanItemsSearch();
    forceBlur();
  };

  const forceBlur = (): void => {
    if (inputEl()) {
      inputEl()!.blur();
    }
  };

  const forceFocus = (): void => {
    if (inputEl()) {
      inputEl()!.focus();
    }
  };

  const onSearch = (text: string) => {
    const filteredItems = props.items.filter((item: BaseItem) => {
      const re = new RegExp(text, 'i');
      if (re.test(item.name)) {
        return item;
      }
    });
    if (filteredItems.length > 0) {
      const isInputFocused = inputEl() === document.activeElement;
      // We have to be sure that input has focus to display results
      if (isInputFocused) {
        setItemsList(filteredItems);
        setVisibleDropdown(true);
      } else {
        cleanItemsSearch();
      }
    } else {
      setItemsList([]);
      setVisibleDropdown(true);
    }
  };

  const search = () => {
    cleanTimeout();
    cleanItemsSearch();
    onSearch(value());
    forceBlur();
  };

  const cleanTimeout = () => {
    if (!isNull(dropdownTimeout())) {
      clearTimeout(dropdownTimeout()!);
      setDropdownTimeout(null);
    }
  };

  const cleanSearchValue = () => {
    setValue('');
    forceFocus();
  };

  const cleanItemsSearch = () => {
    setItemsList(null);
    setVisibleDropdown(false);
    setHighlightedItem(null);
  };

  const updateHighlightedItem = (arrow: 'up' | 'down') => {
    if (!isNull(itemsList()) && visibleDropdown()) {
      if (!isNull(highlightedItem())) {
        let newIndex: number = arrow === 'up' ? highlightedItem()! - 1 : highlightedItem()! + 1;
        if (newIndex > itemsList()!.length) {
          newIndex = 0;
        }
        if (newIndex < 0) {
          newIndex = itemsList()!.length;
        }
        setHighlightedItem(newIndex);
        scrollToHighlightedItem(newIndex);
      } else {
        if (itemsList() && itemsList()!.length > 0) {
          const newIndex = arrow === 'up' ? itemsList()!.length - 1 : 0;
          setHighlightedItem(newIndex);
          scrollToHighlightedItem(newIndex);
        }
      }
    }
  };

  const scrollToHighlightedItem = (index: number) => {
    const element = document.getElementById(`sl-opt${index}`);
    if (element && !isUndefined(dropdownRef())) {
      element.scrollIntoView(false);
    }
  };

  createEffect(
    on(value, () => {
      const isInputFocused = inputEl() === document.activeElement;
      if (isInputFocused) {
        if (value().length >= MIN_CHARACTERS_SEARCH) {
          cleanTimeout();
          setDropdownTimeout(
            setTimeout(() => {
              setHighlightedItem(null);
              onSearch(value());
            }, SEARCH_DELAY)
          );
        } else {
          cleanItemsSearch();
        }
      }
    })
  );

  onCleanup(() => {
    if (!isNull(dropdownTimeout())) {
      clearTimeout(dropdownTimeout()!);
    }
  });

  return (
    <>
      <div
        class={`d-flex align-items-center overflow-hidden searchBar lh-base bg-white mx-auto ${styles.searchBar} search`}
      >
        <input
          data-testid="search-bar"
          ref={setInputEl}
          class={`flex-grow-1 ps-2 ps-md-3 border-0 shadow-none bg-transparent lh-base ${styles.input}`}
          type="text"
          value={value()}
          autocomplete="off"
          autocorrect="off"
          autocapitalize="none"
          spellcheck={false}
          placeholder="Search projects, products and members"
          onKeyDown={onKeyDown}
          onInput={(e) => setValue(e.target.value)}
        />

        <Show when={value() !== ''}>
          <button
            title="Clear text"
            aria-label="Clear search"
            class={`btn btn-link text-muted lh-1 px-2 ${styles.btnIcon}`}
            onClick={cleanSearchValue}
          >
            <SVGIcon kind={SVGIconKind.Clear} />
          </button>
          <div class={`vr ${styles.vr}`} />
        </Show>

        <button
          title="Search text"
          aria-label="Search text"
          class={`btn btn-link lh-1 px-2 ${styles.btnIcon}`}
          onClick={search}
        >
          <div class={`${styles.iconWrapper}`}>
            <SVGIcon kind={SVGIconKind.Search} />
          </div>
        </button>
      </div>

      <Show when={visibleDropdown() && !isNull(itemsList())}>
        <div
          ref={setDropdownRef}
          class={`dropdown-menu dropdown-menu-left p-0 w-100 rounded-0 show noFocus overflow-auto ${styles.dropdown} ${
            styles.visibleScroll
          } ${styles[`listLength-${itemsList()!.length}`]}`}
          role="listbox"
          id="search-list"
        >
          <Show
            when={itemsList()!.length > 0}
            fallback={
              <div class="p-4 text-center fst-italic text-muted">
                <small>We couldn't find any items that match that criteria.</small>
              </div>
            }
          >
            <HoverableItem onLeave={() => setHighlightedItem(null)}>
              <For each={itemsList()!}>
                {(item, index) => {
                  return (
                    <HoverableItem onHover={() => setHighlightedItem(index())} onLeave={() => setHighlightedItem(null)}>
                      <button
                        type="button"
                        class={`btn btn-link text-decoration-none text-black w-100 border-bottom rounded-0 d-flex flex-row align-items-stretch p-3 ${styles.btnProject}`}
                        classList={{ activeDropdownItem: index() === highlightedItem() }}
                        onClick={() => {
                          openItemModal(item.id);
                        }}
                        aria-label={`Open ${item.name} detail`}
                        role="option"
                        aria-selected={index() === highlightedItem()}
                        id={`sl-opt${index()}`}
                      >
                        <div class="d-flex flex-row align-items-center w-100">
                          <div
                            class={`d-flex align-items-center justify-content-center me-3 ${styles.miniImageWrapper}`}
                          >
                            <img
                              alt={`${item.name} logo`}
                              class={`m-auto ${styles.logo}`}
                              src={
                                import.meta.env.MODE === 'development' ? `../../static/${item.logo}` : `${item.logo}`
                              }
                            />
                          </div>
                          <div
                            class={`flex-grow-1 d-flex flex-column text-start justify-content-between h-100 ${styles.truncateWrapper}`}
                          >
                            <div class="d-flex flex-row align-items-baseline">
                              <span class={`text-truncate fw-semibold ${styles.title}`}>{item.name}</span>
                              {!isUndefined(item.maturity) && (
                                <div class={`d-flex flex-nowrap position-relative ${styles.badges}`}>
                                  <FoundationBadge class={`d-none d-xxl-flex ms-2 ${styles.badge}`} />
                                  <MaturityBadge level={item.maturity} class={`ms-2 ${styles.badge}`} />
                                </div>
                              )}
                            </div>
                            <div class={`text-muted text-truncate ${styles.legend}`}>
                              {item.category} / {item.subcategory}
                            </div>
                          </div>
                        </div>
                      </button>
                    </HoverableItem>
                  );
                }}
              </For>
            </HoverableItem>
          </Show>
        </div>
      </Show>
    </>
  );
};

export default Searchbar;
