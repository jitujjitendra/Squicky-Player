(function (blocks, blockEditor, components, element, i18n) {
  const el = element.createElement;
  const Fragment = element.Fragment;
  const InspectorControls = blockEditor.InspectorControls;
  const useBlockProps = blockEditor.useBlockProps;
  const PanelBody = components.PanelBody;
  const TextControl = components.TextControl;
  const SelectControl = components.SelectControl;
  const ToggleControl = components.ToggleControl;

  blocks.registerBlockType("squicky/player", {
    edit: function (props) {
      const attributes = props.attributes;
      const setAttributes = props.setAttributes;
      const blockProps = useBlockProps({
        style: {
          padding: "28px",
          borderRadius: "18px",
          background: "#0b0b0e",
          color: "#fff"
        }
      });

      return el(
        Fragment,
        null,
        el(
          InspectorControls,
          null,
          el(
            PanelBody,
            { title: i18n.__("Player settings", "squicky-player"), initialOpen: true },
            el(TextControl, {
              label: i18n.__("Media URL", "squicky-player"),
              value: attributes.src,
              onChange: function (value) { setAttributes({ src: value }); }
            }),
            el(TextControl, {
              label: i18n.__("Title", "squicky-player"),
              value: attributes.title,
              onChange: function (value) { setAttributes({ title: value }); }
            }),
            el(TextControl, {
              label: i18n.__("Poster URL", "squicky-player"),
              value: attributes.poster,
              onChange: function (value) { setAttributes({ poster: value }); }
            }),
            el(TextControl, {
              label: i18n.__("Thumbnail WebVTT URL", "squicky-player"),
              value: attributes.thumbnails,
              onChange: function (value) { setAttributes({ thumbnails: value }); }
            }),
            el(SelectControl, {
              label: i18n.__("Media kind", "squicky-player"),
              value: attributes.kind,
              options: [
                { label: i18n.__("Video", "squicky-player"), value: "video" },
                { label: i18n.__("Audio", "squicky-player"), value: "audio" }
              ],
              onChange: function (value) { setAttributes({ kind: value }); }
            }),
            el(ToggleControl, {
              label: i18n.__("Autoplay", "squicky-player"),
              checked: attributes.autoplay,
              onChange: function (value) { setAttributes({ autoplay: value }); }
            }),
            el(ToggleControl, {
              label: i18n.__("Start muted", "squicky-player"),
              checked: attributes.muted,
              onChange: function (value) { setAttributes({ muted: value }); }
            })
          )
        ),
        el(
          "div",
          blockProps,
          el("strong", null, attributes.title || i18n.__("Squicky Player", "squicky-player")),
          el(
            "p",
            { style: { marginBottom: 0, color: "#a1a1aa" } },
            attributes.src
              ? attributes.src
              : i18n.__("Add a media URL in the block settings.", "squicky-player")
          )
        )
      );
    },
    save: function () {
      return null;
    }
  });
})(window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.element, window.wp.i18n);
